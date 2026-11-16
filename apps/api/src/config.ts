import { resolve } from "node:path";

export interface AppConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
  port: number;
  host: string;
  webOrigin: string;
  isProduction: boolean;
  webBuildDir?: string;
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

  return {
    supabaseUrl: parsedUrl.toString().replace(/\/$/, ""),
    supabasePublishableKey,
    port: portValue,
    host: isVercel ? "0.0.0.0" : "127.0.0.1",
    webOrigin: env.WEB_ORIGIN?.trim()
      || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "http://127.0.0.1:5173"),
    isProduction: isVercel || env.NODE_ENV === "production",
    ...(isVercel ? { webBuildDir: resolve(process.cwd(), "apps/web/dist") } : {}),
  };
}
