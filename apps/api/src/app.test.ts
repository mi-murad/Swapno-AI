import { afterEach, describe, expect, it } from "vitest";
import type { AppConfig } from "./config.js";
import { buildApp } from "./app.js";
import type { AppDependencies } from "./modules/auth/types.js";

const config: AppConfig = {
  supabaseUrl: "http://127.0.0.1:54321",
  supabasePublishableKey: "sb_publishable_test_only",
  port: 3001,
  host: "127.0.0.1",
  webOrigins: ["http://127.0.0.1:5173", "https://preview-alias.example.vercel.app"],
  isProduction: false,
};

const testUser = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "owner@example.test",
  user_metadata: { display_name: "Test Owner" },
  app_metadata: {},
  aud: "authenticated",
  created_at: new Date(0).toISOString(),
};

function dependencies(): AppDependencies {
  return {
    auth: {
      async signUp() {
        return {
          user: testUser as never,
          session: { access_token: "secret-access-token", refresh_token: "secret-refresh-token", expires_in: 3600 },
          error: null,
        };
      },
      async signIn() {
        return {
          user: testUser as never,
          session: { access_token: "secret-access-token", refresh_token: "secret-refresh-token", expires_in: 3600 },
          error: null,
        };
      },
      async getUser(token) {
        return token === "secret-access-token" ? { user: testUser as never, error: null } : { user: null, error: new Error("invalid") };
      },
      async refreshSession() {
        return { session: null, user: null, error: new Error("expired") };
      },
      async signOut() {},
    },
    userClient() {
      return {
        from() {
          return {
            select: () => ({ order: async () => ({ data: [], error: null }) }),
          };
        },
        async rpc() {
          return { data: [{ workspace_id: "a0000000-0000-4000-8000-000000000001", name: "Test", created_at: new Date(0).toISOString() }], error: null };
        },
        storage: {},
      };
    },
  };
}

const servers: Array<Awaited<ReturnType<typeof buildApp>>> = [];

async function createServer() {
  const app = await buildApp(config, dependencies());
  servers.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("API authentication and request boundaries", () => {
  it("does not return access or refresh tokens to the browser", async () => {
    const app = await createServer();
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { origin: config.webOrigins[0] },
      payload: { email: "owner@example.test", password: "a-long-test-password" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ user: { id: testUser.id, email: testUser.email, displayName: "Test Owner" } });
    expect(response.headers["set-cookie"]).toEqual(expect.arrayContaining([
      expect.stringContaining("HttpOnly"),
      expect.stringContaining("swapno_access="),
      expect.stringContaining("swapno_refresh="),
    ]));
    expect(response.body).not.toContain("secret-access-token");
    expect(response.body).not.toContain("secret-refresh-token");
  });

  it("requires authentication to read workspace content drafts", async () => {
    const app = await createServer();
    const response = await app.inject({
      method: "GET",
      url: "/api/workspaces/a0000000-0000-4000-8000-000000000001/content-drafts",
    });
    expect(response.statusCode).toBe(401);
  });

  it("rejects cross-origin content draft approval attempts", async () => {
    const app = await createServer();
    const response = await app.inject({
      method: "POST",
      url: "/api/workspaces/a0000000-0000-4000-8000-000000000001/content-drafts/b0000000-0000-4000-8000-000000000001/approvals",
      headers: { origin: "https://attacker.example" },
      payload: { revision: 1, decision: "approved", note: "" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("requires a verified session to list workspaces", async () => {
    const app = await createServer();
    const response = await app.inject({ method: "GET", url: "/api/workspaces" });
    expect(response.statusCode).toBe(401);
  });

  it("maps the database workspace RPC result to the frontend workspace contract", async () => {
    const app = await createServer();
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { origin: config.webOrigins[0] },
      payload: { email: "owner@example.test", password: "a-long-test-password" },
    });
    const cookie = (login.headers["set-cookie"] as string[]).map((value) => value.split(";", 1)[0]).join("; ");
    const response = await app.inject({
      method: "POST",
      url: "/api/workspaces",
      headers: { origin: config.webOrigins[0], cookie },
      payload: { name: "A test workspace" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      workspace: {
        id: "a0000000-0000-4000-8000-000000000001",
        name: "Test",
        created_at: new Date(0).toISOString(),
      },
    });
  });

  it("accepts an explicitly allowlisted preview alias", async () => {
    const app = await createServer();
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { origin: "https://preview-alias.example.vercel.app" },
      payload: { email: "owner@example.test", password: "a-long-test-password" },
    });
    expect(response.statusCode).toBe(200);
  });

  it("rejects a mutation without an Origin header", async () => {
    const app = await createServer();
    const response = await app.inject({
      method: "POST",
      url: "/api/workspaces",
      payload: { name: "No origin" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("rejects a cross-origin mutation before reading auth or data", async () => {
    const app = await createServer();
    const response = await app.inject({
      method: "POST",
      url: "/api/workspaces",
      headers: { origin: "https://attacker.example" },
      payload: { name: "Injected" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("sets production cookies as Secure and HttpOnly", async () => {
    const app = await buildApp({ ...config, isProduction: true }, dependencies());
    servers.push(app);
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { origin: config.webOrigins[0] },
      payload: { email: "owner@example.test", password: "a-long-test-password" },
    });
    const cookies = response.headers["set-cookie"] as string[];
    expect(cookies.every((cookie) => cookie.includes("Secure") && cookie.includes("HttpOnly"))).toBe(true);
  });
});
