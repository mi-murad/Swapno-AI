import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Fastify from "fastify";
import { readConfig } from "./apps/api/src/config.js";
import { buildApp } from "./apps/api/src/app.js";

// Vercel detects Fastify projects from a direct framework import in the entrypoint.
void Fastify;

if (process.env.NODE_ENV !== "production") {
  const localEnvFile = resolve(process.cwd(), ".env");
  if (existsSync(localEnvFile)) process.loadEnvFile(localEnvFile);
}

const config = readConfig();
const app = await buildApp(config);
await app.listen({ port: config.port, host: config.host });
