import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { readConfig } from "./config.js";

describe("readConfig", () => {
  it("uses Vercel's listener port and deployment origin when PORT is absent", () => {
    const config = readConfig({
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
      VERCEL: "1",
      VERCEL_URL: "swapno-ai-preview.example.vercel.app",
      NODE_ENV: "preview",
    } as NodeJS.ProcessEnv);

    expect(config.webOrigins).toEqual(["https://swapno-ai-preview.example.vercel.app"]);
    expect(config.port).toBe(3000);
    expect(config.host).toBe("0.0.0.0");
    expect(config.isProduction).toBe(true);
    expect(config.webBuildDir).toBe(resolve(process.cwd(), "apps/web/dist"));
  });

  it("honors an explicit platform PORT", () => {
    const config = readConfig({
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
      VERCEL: "1",
      PORT: "4317",
    } as NodeJS.ProcessEnv);
    expect(config.port).toBe(4317);
  });

  it("accepts a comma-separated exact origin allowlist and normalizes duplicates", () => {
    const config = readConfig({
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
      WEB_ORIGINS: "https://preview.example.com, https://alias.example.com, https://preview.example.com",
    } as NodeJS.ProcessEnv);

    expect(config.webOrigins).toEqual(["https://preview.example.com", "https://alias.example.com"]);
  });

  it("combines explicit stable aliases with the current Vercel deployment hostname", () => {
    const config = readConfig({
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
      VERCEL: "1",
      VERCEL_URL: "swapno-ai-new-deployment.example.vercel.app",
      WEB_ORIGINS: "https://swapno-ai-preview.example.com",
    } as NodeJS.ProcessEnv);

    expect(config.webOrigins).toEqual([
      "https://swapno-ai-preview.example.com",
      "https://swapno-ai-new-deployment.example.vercel.app",
    ]);
  });

  it("keeps local defaults and supports the legacy single-origin setting", () => {
    const local = readConfig({
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
      API_PORT: "3010",
    } as NodeJS.ProcessEnv);
    const explicit = readConfig({
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
      WEB_ORIGIN: "http://127.0.0.1:5174",
    } as NodeJS.ProcessEnv);

    expect(local.port).toBe(3010);
    expect(local.webOrigins).toEqual(["http://127.0.0.1:5173"]);
    expect(explicit.port).toBe(3001);
    expect(explicit.host).toBe("127.0.0.1");
    expect(explicit.webOrigins).toEqual(["http://127.0.0.1:5174"]);
    expect(explicit.webBuildDir).toBeUndefined();
  });

  it("rejects insecure non-local origins and URL paths", () => {
    const base = {
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
    };
    expect(() => readConfig({ ...base, WEB_ORIGINS: "http://preview.example.com" } as NodeJS.ProcessEnv)).toThrow(/HTTPS/);
    expect(() => readConfig({ ...base, WEB_ORIGINS: "https://preview.example.com/login" } as NodeJS.ProcessEnv)).toThrow(/origins only/);
  });
});
