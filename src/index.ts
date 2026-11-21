// Vercel's Fastify framework preset detects supported entrypoint names
// including src/index.ts. Keep the app factory shared with local development.
import { readConfig } from "../apps/api/dist/config.js";
import { buildApp } from "../apps/api/dist/app.js";

const app = await buildApp(readConfig());
await app.listen({
  port: Number(process.env.PORT ?? 3000),
  host: "0.0.0.0",
});
