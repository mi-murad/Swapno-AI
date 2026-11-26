import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Fastify from "fastify";
import { readConfig } from "./apps/api/src/config.js";
import { buildApp } from "./apps/api/src/app.js";

// Keep a direct framework import so Vercel detects the Fastify backend.
void Fastify;

const isVercelRuntime = process.env.VERCEL === "1"
  || Boolean(process.env.VERCEL_URL || process.env.VERCEL_ENV);

if (!isVercelRuntime && process.env.NODE_ENV !== "production") {
  const localEnvFile = resolve(process.cwd(), ".env");
  if (existsSync(localEnvFile)) process.loadEnvFile(localEnvFile);
}

const config = readConfig();
const app = await buildApp(config);

// Vercel's Fastify runtime expects the app to start its listener. Use the
// platform-provided PORT and bind to 0.0.0.0 in deployed environments.
try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error(
    { errorName: error instanceof Error ? error.name : "UnknownError" },
    "Could not start Fastify server",
  );
  throw error;
}
