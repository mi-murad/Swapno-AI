import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { AppConfig } from "./config.js";
import { createDependencies } from "./supabase.js";
import type { AppDependencies } from "./modules/auth/types.js";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { registerWorkspaceRoutes } from "./modules/workspaces/routes.js";
import { registerBusinessBrainRoutes } from "./modules/business-brain/routes.js";

export async function buildApp(
  config: AppConfig,
  dependencies: AppDependencies = createDependencies(config),
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV === "test" ? false : { level: "info" },
    bodyLimit: 1024 * 1024,
    trustProxy: false,
  });

  await app.register(cookie);
  await app.register(helmet, {
    contentSecurityPolicy: false,
    strictTransportSecurity: config.isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  });
  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: "1 minute",
  });

  app.addHook("onRequest", async (request, reply) => {
    if (!request.url.startsWith("/api/") || ["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
    if (request.headers.origin !== config.webOrigin) {
      return reply.code(403).send({ error: "Request origin is not allowed." });
    }
  });

  app.get("/health", async () => ({ status: "ok" }));
  await registerAuthRoutes(app, dependencies, config);
  await registerWorkspaceRoutes(app, dependencies, config);
  await registerBusinessBrainRoutes(app, dependencies, config);

  if (config.webBuildDir) {
    const webRoot = resolve(config.webBuildDir);
    app.get("/*", async (request, reply) => {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      if (pathname === "/api" || pathname.startsWith("/api/")) {
        return reply.code(404).send({ error: "Not found." });
      }

      const relativePath = pathname.replace(/^\/+/, "");
      let filePath = resolve(webRoot, relativePath || "index.html");
      if (filePath !== webRoot && !filePath.startsWith(`${webRoot}${sep}`)) {
        return reply.code(404).send({ error: "Not found." });
      }

      try {
        if (!(await stat(filePath)).isFile()) filePath = resolve(webRoot, "index.html");
      } catch {
        if (extname(relativePath)) return reply.code(404).send({ error: "Not found." });
        filePath = resolve(webRoot, "index.html");
      }

      const extension = extname(filePath).toLowerCase();
      const contentType = extension === ".html" ? "text/html; charset=utf-8"
        : extension === ".js" ? "text/javascript; charset=utf-8"
          : extension === ".css" ? "text/css; charset=utf-8"
            : extension === ".svg" ? "image/svg+xml"
              : extension === ".png" ? "image/png"
                : extension === ".ico" ? "image/x-icon"
                  : extension === ".woff2" ? "font/woff2"
                    : extension === ".webp" ? "image/webp"
                      : "application/octet-stream";
      const cacheControl = relativePath.startsWith("assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache";
      return reply.type(contentType).header("cache-control", cacheControl).send(await readFile(filePath));
    });
  }

  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: "Not found." }));
  app.setErrorHandler((caught, _request, reply) => {
    const error = caught instanceof Error ? caught : new Error("Unknown request error");
    const statusCode = typeof caught === "object" && caught !== null && "statusCode" in caught
      && typeof caught.statusCode === "number" ? caught.statusCode : undefined;
    if (statusCode && statusCode < 500) {
      return reply.code(statusCode).send({ error: error.message });
    }
    requestLogError(app, error);
    return reply.code(500).send({ error: "The request could not be completed." });
  });

  return app;
}

function requestLogError(app: FastifyInstance, error: Error): void {
  app.log.error({ errorName: error.name }, "API request failed");
}
