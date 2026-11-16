import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../../config.js";
import { authenticateRequest } from "../auth/authenticate.js";
import type { AppDependencies, AuthenticatedActor } from "../auth/types.js";
import { businessBrainBody, profileFields } from "./schema.js";

const paramsSchema = z.object({ workspaceId: z.uuid() });

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

function deniedAsNotFound(error: { code?: string } | null, reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }) {
  if (error?.code === "42501" || error?.code === "PGRST116") {
    reply.code(404).send({ error: "Workspace or Business Brain not found." });
    return true;
  }
  return false;
}

export async function registerBusinessBrainRoutes(
  app: FastifyInstance,
  dependencies: AppDependencies,
  config: AppConfig,
): Promise<void> {
  app.get("/api/workspaces/:workspaceId/business-brain", async (request, reply) => {
    const actor = await actorOrReply(request, reply, dependencies, config);
    if (!actor) return;
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "Invalid workspace." });

    const { data, error } = await actor.client.from("business_brain_profiles")
      .select("*")
      .eq("workspace_id", params.data.workspaceId)
      .maybeSingle();
    if (deniedAsNotFound(error, reply)) return;
    if (error) return reply.code(500).send({ error: "Business Brain could not be loaded." });
    return reply.send({ profile: data ?? null });
  });

  app.get("/api/workspaces/:workspaceId/business-brain/history", async (request, reply) => {
    const actor = await actorOrReply(request, reply, dependencies, config);
    if (!actor) return;
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "Invalid workspace." });

    const { data, error } = await actor.client.from("business_brain_revisions")
      .select("id,profile_id,workspace_id,revision,event_kind,snapshot,source_kind,verification_status,change_note,changed_by,changed_at")
      .eq("workspace_id", params.data.workspaceId)
      .order("revision", { ascending: false })
      .limit(30);
    if (deniedAsNotFound(error, reply)) return;
    if (error) return reply.code(500).send({ error: "Business Brain history could not be loaded." });
    return reply.send({ revisions: data ?? [] });
  });

  app.put("/api/workspaces/:workspaceId/business-brain", async (request, reply) => {
    const actor = await actorOrReply(request, reply, dependencies, config);
    if (!actor) return;
    const params = paramsSchema.safeParse(request.params);
    const parsed = businessBrainBody.safeParse(request.body);
    if (!params.success) return reply.code(400).send({ error: "Invalid workspace." });
    if (!parsed.success) return reply.code(400).send({ error: "Check the Business Brain fields and try again." });

    const workspaceId = params.data.workspaceId;
    const input = profileFields(parsed.data);
    const { data: current, error: currentError } = await actor.client.from("business_brain_profiles")
      .select("id,revision")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (deniedAsNotFound(currentError, reply)) return;
    if (currentError) return reply.code(500).send({ error: "Business Brain could not be saved." });

    if (current) {
      if (parsed.data.expectedRevision !== current.revision) {
        return reply.code(409).send({ error: "This Business Brain changed in another session. Reload the latest version before saving." });
      }
      const { data, error } = await actor.client.from("business_brain_profiles")
        .update(input)
        .eq("workspace_id", workspaceId)
        .eq("revision", parsed.data.expectedRevision)
        .select("*")
        .maybeSingle();
      if (deniedAsNotFound(error, reply)) return;
      if (error) return reply.code(500).send({ error: "Business Brain could not be saved." });
      if (!data) return reply.code(409).send({ error: "This Business Brain changed in another session. Reload the latest version before saving." });
      return reply.send({ profile: data });
    }

    if (parsed.data.expectedRevision !== null) {
      return reply.code(409).send({ error: "This Business Brain no longer exists. Reload the workspace before saving." });
    }
    const { data, error } = await actor.client.from("business_brain_profiles")
      .insert({ workspace_id: workspaceId, ...input })
      .select("*")
      .single();
    if (deniedAsNotFound(error, reply)) return;
    if (error?.code === "23505") return reply.code(409).send({ error: "A Business Brain already exists. Reload before saving." });
    if (error) return reply.code(500).send({ error: "Business Brain could not be saved." });
    return reply.code(201).send({ profile: data });
  });
}
