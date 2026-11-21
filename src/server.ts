// Vercel's Fastify adapter owns the request lifecycle. Export the Fastify
// instance instead of starting a standalone TCP listener in the function.
import { readConfig } from "../apps/api/dist/config.js";
import { buildApp } from "../apps/api/dist/app.js";

const app = await buildApp(readConfig());

export default app;
