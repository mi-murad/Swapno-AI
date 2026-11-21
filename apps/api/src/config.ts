import { resolve } from "node:path";

export interface AppConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
  port: number;
  host: string;
  webOrigins: string[];
  isProduction: boolean;
  webBuildDir?: string;
}

function parseWebOrigins(value: string): string[] {
  const origins = value.split(",").map((item) => item.trim()).filter(Boolean);
  const normalized = origins.map((origin) => {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error("WEB_ORIGINS must contain valid absolute origins.");
    }
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      || parsed.username
      || parsed.password
      || parsed.pathname !== "/"
      || parsed.search
      || parsed.hash
    ) {
      throw new Error("WEB_ORIGINS entries must be origins only, without paths or credentials.");
    }
    if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) {
      throw new Error("Non-local WEB_ORIGINS entries must use HTTPS.");
    }
    return parsed.origin;
  });
  return [...new Set(normalized)];
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const supabaseUrl = env.SUPABASE_URL?.trim();
  const supabasePublishableKey = env.SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !supabasePublishableKey || supabasePublishableKey.includes("replace_with")) {
    throw new Error(
      "Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in the local .env file. Get local values from `npm run supabase:start`.",
    );
  }

  const parsedUrl = new URL(supabaseUrl);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("SUPABASE_URL must use http or https.");
  }

  const isVercel = env.VERCEL === "1";
  const portValue = Number(env.PORT ?? env.API_PORT ?? "3001");
  if (!Number.isInteger(portValue) || portValue < 1 || portValue > 65535) {
    throw new Error("API_PORT must be a valid TCP port.");
  }

  const deploymentOrigin = env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "";
  const configuredOrigins = [
    env.WEB_ORIGINS?.trim(),
    env.WEB_ORIGIN?.trim(),
    deploymentOrigin,
  ].filter(Boolean).join(",") || "http://127.0.0.1:5173";

  return {
    supabaseUrl: parsedUrl.toString().replace(/\/$/, ""),
    supabasePublishableKey,
    port: portValue,
    host: isVercel ? "0.0.0.0" : "127.0.0.1",
    webOrigins: parseWebOrigins(configuredOrigins),
    isProduction: isVercel || env.NODE_ENV === "production",
    ...(isVercel ? { webBuildDir: resolve(process.cwd(), "apps/web/dist") } : {}),
  };
}
