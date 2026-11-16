import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { readConfig } from "./config.js";
import { buildApp } from "./app.js";

const localEnvFile = resolve(process.cwd(), "../../.env");
if (existsSync(localEnvFile)) process.loadEnvFile(localEnvFile);

const config = readConfig();
const app = await buildApp(config);

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error({ errorName: error instanceof Error ? error.name : "UnknownError" }, "Could not start API server");
  process.exitCode = 1;
}
