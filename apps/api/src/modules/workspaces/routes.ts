import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../../config.js";
import type { AppDependencies, AuthenticatedActor } from "../auth/types.js";
import { authenticateRequest } from "../auth/authenticate.js";

const createWorkspaceBody = z.object({ name: z.string().trim().min(1).max(80) }).strict();

async function actorOrReply(
  request: Parameters<typeof authenticateRequest>[0],
  reply: Parameters<typeof authenticateRequest>[1],
  dependencies: AppDependencies,
  config: AppConfig,
): Promise<AuthenticatedActor | null> {
  const actor = await authenticateRequest(request, reply, dependencies, config);
  if (!actor) reply.code(401).send({ error: "Sign in to continue." });
  return actor;
}

export async function registerWorkspaceRoutes(
  app: FastifyInstance,
  dependencies: AppDependencies,
  config: AppConfig,
): Promise<void> {
  app.get("/api/workspaces", async (request, reply) => {
    const actor = await actorOrReply(request, reply, dependencies, config);
    if (!actor) return;

    const { data, error } = await actor.client.from("workspaces")
      .select("id,name,created_at")
      .order("created_at", { ascending: true });
    if (error) return reply.code(500).send({ error: "Workspaces could not be loaded." });
    return reply.send({ workspaces: data ?? [] });
  });

  app.post("/api/workspaces", async (request, reply) => {
    const actor = await actorOrReply(request, reply, dependencies, config);
    if (!actor) return;
    const parsed = createWorkspaceBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Workspace name must be between 1 and 80 characters." });

    const { data, error } = await actor.client.rpc("create_workspace", { workspace_name: parsed.data.name });
    if (error) {
      request.log.error({ code: error.code }, "Workspace creation failed");
      return reply.code(error.code === "42501" ? 403 : 500).send({ error: "Workspace could not be created." });
    }
    const workspace = Array.isArray(data) ? data[0] : data;
    if (!workspace || typeof workspace !== "object" || !("workspace_id" in workspace)) {
      return reply.code(500).send({ error: "Workspace could not be created." });
    }
    return reply.code(201).send({
      workspace: {
        id: workspace.workspace_id,
        name: workspace.name,
        created_at: workspace.created_at,
      },
    });
  });
}
