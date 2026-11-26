import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Fastify from "fastify";
import { readConfig } from "./apps/api/src/config.js";
import { buildApp } from "./apps/api/src/app.js";

// Keep a direct framework import so Vercel detects the Fastify backend.
void Fastify;

if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
  const localEnvFile = resolve(process.cwd(), ".env");
  if (existsSync(localEnvFile)) process.loadEnvFile(localEnvFile);
}

const config = readConfig();
const app = await buildApp(config);

// Vercel's Fastify adapter owns the request lifecycle. Export the app instead
// of opening a long-lived listener inside the serverless function.
if (process.env.VERCEL !== "1") {
  await app.listen({ port: config.port, host: config.host });
}

export default app;
