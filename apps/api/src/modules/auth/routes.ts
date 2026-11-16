import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../../config.js";
import type { AppDependencies } from "./types.js";
import { authenticateRequest, clearSessionCookies, writeSessionCookies } from "./authenticate.js";

const signUpBody = z.object({
  email: z.email().max(254),
  password: z.string().min(12).max(128),
  displayName: z.string().trim().min(1).max(100),
}).strict();

const signInBody = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
}).strict();

function safeUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  return {
    id: user.id,
    email: user.email ?? "",
    displayName: typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "",
  };
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  dependencies: AppDependencies,
  config: AppConfig,
): Promise<void> {
  app.post("/api/auth/signup", {
    config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
  }, async (request, reply) => {
    const parsed = signUpBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Check your name, email, and password (12 characters minimum)." });

    const result = await dependencies.auth.signUp(parsed.data);
    if (result.error || !result.user) return reply.code(400).send({ error: "We could not create this account. Check the details or try signing in." });

    if (result.session) writeSessionCookies(reply, config, result.session);
    return reply.code(result.session ? 201 : 202).send({
      user: safeUser(result.user),
      confirmationRequired: !result.session,
    });
  });

  app.post("/api/auth/login", {
    config: { rateLimit: { max: 8, timeWindow: "15 minutes" } },
  }, async (request, reply) => {
    const parsed = signInBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Enter a valid email and password." });

    const result = await dependencies.auth.signIn(parsed.data);
    if (result.error || !result.user || !result.session) return reply.code(401).send({ error: "Email or password is incorrect." });

    writeSessionCookies(reply, config, result.session);
    return reply.send({ user: safeUser(result.user) });
  });

  app.get("/api/auth/me", async (request, reply) => {
    const actor = await authenticateRequest(request, reply, dependencies, config);
    if (!actor) return reply.code(401).send({ error: "Sign in to continue." });
    return reply.send({ user: safeUser(actor.user) });
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const accessToken = request.cookies.swapno_access;
    const refreshToken = request.cookies.swapno_refresh;
    try {
      if (accessToken && refreshToken) await dependencies.auth.signOut(accessToken, refreshToken);
    } finally {
      clearSessionCookies(reply, config);
    }
    return reply.code(204).send();
  });
}
