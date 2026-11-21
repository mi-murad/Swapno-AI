// Vercel detects this root-level Fastify entrypoint and manages the
// listener for incoming function requests. Keep app construction separate
// from the local development server in apps/api/src/server.ts.
import { readConfig } from "../apps/api/dist/config.js";
import { buildApp } from "../apps/api/dist/app.js";

const app = await buildApp(readConfig());
await app.listen({
  port: Number(process.env.PORT ?? 3000),
  host: "0.0.0.0",
});
