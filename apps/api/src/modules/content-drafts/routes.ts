import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../../config.js";
import { authenticateRequest } from "../auth/authenticate.js";
import type { AppDependencies, AuthenticatedActor } from "../auth/types.js";

const workspaceParams = z.object({ workspaceId: z.uuid() });
const draftParams = z.object({ workspaceId: z.uuid(), draftId: z.uuid() });
const draftBody = z.object({
  expectedRevision: z.number().int().positive().nullable().optional(),
  title: z.string().trim().min(1).max(200),
  platform: z.enum(["general", "facebook", "instagram", "linkedin", "tiktok", "youtube"]).default("general"),
  content_type: z.enum(["post", "caption", "story", "reel_script", "video_script", "ad_copy"]).default("post"),
  language: z.enum(["en", "bn"]).default("bn"),
  body: z.string().max(20000).default(""),
  status: z.enum(["draft", "archived"]).default("draft"),
}).strict();
const approvalBody = z.object({
  revision: z.number().int().positive(),
  decision: z.enum(["approved", "changes_requested"]),
  note: z.string().trim().max(2000).default(""),
}).strict();

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

export async function registerContentDraftRoutes(
  app: FastifyInstance,
  dependencies: AppDependencies,
  config: AppConfig,
): Promise<void> {
  app.get("/api/workspaces/:workspaceId/content-drafts", async (request, reply) => {
    const actor = await actorOrReply(request, reply, dependencies, config);
    if (!actor) return;
    const params = workspaceParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "Invalid workspace." });

    const { data, error } = await actor.client.from("content_drafts")
      .select("id,workspace_id,title,platform,content_type,language,body,status,revision,created_at,updated_at")
      .eq("workspace_id", params.data.workspaceId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) return reply.code(500).send({ error: "Content drafts could not be loaded." });

    const ids = (data ?? []).map((draft: { id: string }) => draft.id);
    let approvals: unknown[] = [];
    if (ids.length) {
      const result = await actor.client.from("content_approvals")
        .select("id,draft_id,revision,decision,note,decided_by,decided_at")
        .eq("workspace_id", params.data.workspaceId)
        .in("draft_id", ids);
      if (result.error) return reply.code(500).send({ error: "Approval records could not be loaded." });
      approvals = result.data ?? [];
    }
    return reply.send({ drafts: data ?? [], approvals });
  });

  app.post("/api/workspaces/:workspaceId/content-drafts", async (request, reply) => {
    const actor = await actorOrReply(request, reply, dependencies, config);
    if (!actor) return;
    const params = workspaceParams.safeParse(request.params);
    const parsed = draftBody.safeParse(request.body);
    if (!params.success) return reply.code(400).send({ error: "Invalid workspace." });
    if (!parsed.success) return reply.code(400).send({ error: "Check the content draft fields and try again." });

    const { data, error } = await actor.client.from("content_drafts")
      .insert({ workspace_id: params.data.workspaceId, ...parsed.data })
      .select("*")
      .single();
    if (error) return reply.code(error.code === "42501" ? 404 : 500)
      .send({ error: "Content draft could not be created." });
    return reply.code(201).send({ draft: data });
  });

  app.put("/api/workspaces/:workspaceId/content-drafts/:draftId", async (request, reply) => {
    const actor = await actorOrReply(request, reply, dependencies, config);
    if (!actor) return;
    const params = draftParams.safeParse(request.params);
    const parsed = draftBody.safeParse(request.body);
    if (!params.success) return reply.code(400).send({ error: "Invalid content draft." });
    if (!parsed.success || parsed.data.expectedRevision == null) {
      return reply.code(400).send({ error: "A valid expected revision is required to update a draft." });
    }

    const { expectedRevision, ...fields } = parsed.data;
    const { data, error } = await actor.client.from("content_drafts")
      .update(fields)
      .eq("id", params.data.draftId)
      .eq("workspace_id", params.data.workspaceId)
      .eq("revision", expectedRevision)
      .select("*")
      .maybeSingle();
    if (error) return reply.code(500).send({ error: "Content draft could not be updated." });
    if (!data) return reply.code(409).send({ error: "This draft changed in another session. Reload the latest revision before saving." });
    return reply.send({ draft: data });
  });

  app.get("/api/workspaces/:workspaceId/content-drafts/:draftId/revisions", async (request, reply) => {
    const actor = await actorOrReply(request, reply, dependencies, config);
    if (!actor) return;
    const params = draftParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "Invalid content draft." });

    const { data, error } = await actor.client.from("content_draft_revisions")
      .select("id,draft_id,workspace_id,revision,snapshot,created_by,created_at")
      .eq("workspace_id", params.data.workspaceId)
      .eq("draft_id", params.data.draftId)
      .order("revision", { ascending: false })
      .limit(50);
    if (error) return reply.code(500).send({ error: "Draft history could not be loaded." });
    return reply.send({ revisions: data ?? [] });
  });

  app.post("/api/workspaces/:workspaceId/content-drafts/:draftId/approvals", async (request, reply) => {
    const actor = await actorOrReply(request, reply, dependencies, config);
    if (!actor) return;
    const params = draftParams.safeParse(request.params);
    const parsed = approvalBody.safeParse(request.body);
    if (!params.success) return reply.code(400).send({ error: "Invalid content draft." });
    if (!parsed.success) return reply.code(400).send({ error: "Check the approval details and try again." });

    const { data, error } = await actor.client.from("content_approvals")
      .insert({
        draft_id: params.data.draftId,
        workspace_id: params.data.workspaceId,
        ...parsed.data,
        decided_by: actor.user.id,
      })
      .select("id,draft_id,workspace_id,revision,decision,note,decided_by,decided_at")
      .single();
    if (error?.code === "23505") return reply.code(409).send({ error: "This revision already has an approval decision." });
    if (error?.code === "42501" || error?.code === "23503") {
      return reply.code(409).send({ error: "Only a current revision in your workspace can be approved." });
    }
    if (error) return reply.code(500).send({ error: "The approval decision could not be saved." });
    return reply.code(201).send({ approval: data });
  });
}
