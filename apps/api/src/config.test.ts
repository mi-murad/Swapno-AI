import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { readConfig } from "./config.js";

describe("readConfig", () => {
  it("uses the Vercel preview origin, secure cookies, and static build path", () => {
    const config = readConfig({
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
      VERCEL: "1",
      VERCEL_URL: "swapno-ai-preview.example.vercel.app",
      PORT: "3000",
      NODE_ENV: "preview",
    } as NodeJS.ProcessEnv);

    expect(config.webOrigin).toBe("https://swapno-ai-preview.example.vercel.app");
    expect(config.port).toBe(3000);
    expect(config.host).toBe("0.0.0.0");
    expect(config.isProduction).toBe(true);
    expect(config.webBuildDir).toBe(resolve(process.cwd(), "apps/web/dist"));
  });

  it("keeps local defaults and accepts an explicit configured origin", () => {
    const config = readConfig({
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
      API_PORT: "3010",
      WEB_ORIGIN: "http://127.0.0.1:5174",
    } as NodeJS.ProcessEnv);

    expect(config.port).toBe(3010);
    expect(config.host).toBe("127.0.0.1");
    expect(config.webOrigin).toBe("http://127.0.0.1:5174");
    expect(config.webBuildDir).toBeUndefined();
  });
});
