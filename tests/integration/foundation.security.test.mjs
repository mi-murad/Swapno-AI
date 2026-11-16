import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const envFile = resolve(process.cwd(), ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const webOrigin = process.env.WEB_ORIGIN ?? "http://127.0.0.1:5173";
const runId = randomUUID();
const password = `${randomBytes(24).toString("base64url")}A9!`;

function requireLocalConfiguration() {
  assert.ok(supabaseUrl, "Set SUPABASE_URL in the root .env file.");
  assert.ok(publishableKey && !publishableKey.includes("replace_with"), "Set SUPABASE_PUBLISHABLE_KEY from the local Supabase CLI output.");
  assert.match(new URL(supabaseUrl).hostname, /^(127\.0\.0\.1|localhost)$/i, "This integration suite only permits local Supabase URLs.");
}

function cookieHeader(response) {
  const cookies = response.headers.getSetCookie?.() ?? [];
  assert.ok(cookies.length >= 2, "Expected both HttpOnly auth cookies.");
  assert.ok(cookies.every((cookie) => /(?:^|;\s*)httponly/i.test(cookie)), "Auth cookies must be HttpOnly.");
  return cookies.map((cookie) => cookie.split(";", 1)[0]).join("; ");
}

async function apiRequest(path, { cookie, method = "GET", body } = {}) {
  const headers = { Origin: webOrigin };
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(new URL(path, apiBaseUrl), {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return response;
}

async function assertStatus(response, expected, label) {
  if (response.status !== expected) {
    throw new Error(`${label}: expected HTTP ${expected}, received ${response.status}: ${await response.text()}`);
  }
}

async function register(email, displayName) {
  const response = await apiRequest("/api/auth/signup", {
    method: "POST",
    body: { email, password, displayName },
  });
  await assertStatus(response, 201, "Registration failed");
  const result = await response.json();
  assert.equal(result.confirmationRequired, false, "Local registration should issue a session with local email confirmation disabled.");
  assert.equal(JSON.stringify(result).includes("access_token"), false, "Access tokens must not appear in API JSON.");
  assert.equal(JSON.stringify(result).includes("refresh_token"), false, "Refresh tokens must not appear in API JSON.");
  return result.user;
}

async function login(email) {
  const response = await apiRequest("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  await assertStatus(response, 200, "Login failed");
  const body = await response.json();
  assert.equal(JSON.stringify(body).includes("access_token"), false, "Access tokens must not appear in API JSON.");
  assert.equal(JSON.stringify(body).includes("refresh_token"), false, "Refresh tokens must not appear in API JSON.");
  return { user: body.user, cookie: cookieHeader(response) };
}

async function createWorkspace(session, name) {
  const response = await apiRequest("/api/workspaces", {
    cookie: session.cookie,
    method: "POST",
    body: { name },
  });
  await assertStatus(response, 201, "Workspace creation failed");
  return (await response.json()).workspace;
}

async function saveBrain(session, workspaceId, input) {
  const response = await apiRequest(`/api/workspaces/${workspaceId}/business-brain`, {
    cookie: session.cookie,
    method: "PUT",
    body: input,
  });
  return response;
}

test("real two-user authentication, workspace RLS, persistence, roles, and private Storage", async (t) => {
  requireLocalConfiguration();

  const emailA = `swapno-verify-${runId}-a@example.test`;
  const emailB = `swapno-verify-${runId}-b@example.test`;
  const userA = await register(emailA, "Isolation Test A");
  const userB = await register(emailB, "Isolation Test B");
  let sessionA = await login(emailA);
  const sessionB = await login(emailB);
  assert.equal(sessionA.user.id, userA.id);
  assert.equal(sessionB.user.id, userB.id);
  const workspaceA = await createWorkspace(sessionA, `Verification A ${runId.slice(0, 8)}`);
  const workspaceB = await createWorkspace(sessionB, `Verification B ${runId.slice(0, 8)}`);

  const brainAResponse = await saveBrain(sessionA, workspaceA.id, {
    expectedRevision: null,
    business_name: `Private Business A ${runId}`,
    source_kind: "manual_entry",
    source_label: "Security integration test A",
    verification_status: "confirmed",
    change_note: "Create test record",
  });
  await assertStatus(brainAResponse, 201, "User A Business Brain create failed");
  const brainA = (await brainAResponse.json()).profile;

  const brainBResponse = await saveBrain(sessionB, workspaceB.id, {
    expectedRevision: null,
    business_name: `Private Business B ${runId}`,
    source_kind: "manual_entry",
    source_label: "Security integration test B",
    verification_status: "confirmed",
    change_note: "Create test record",
  });
  await assertStatus(brainBResponse, 201, "User B Business Brain create failed");
  const brainB = (await brainBResponse.json()).profile;

  const clientA = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const clientB = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const signedInA = await clientA.auth.signInWithPassword({ email: emailA, password });
  const signedInB = await clientB.auth.signInWithPassword({ email: emailB, password });
  assert.ifError(signedInA.error);
  assert.ifError(signedInB.error);
  assert.equal(signedInA.data.user.id, userA.id);
  assert.equal(signedInB.data.user.id, userB.id);

  await t.test("each real user sees only their workspace and Business Brain through the API", async () => {
    for (const [session, own, foreign, foreignName] of [
      [sessionA, workspaceA, workspaceB, brainB.business_name],
      [sessionB, workspaceB, workspaceA, brainA.business_name],
    ]) {
      const listResponse = await apiRequest("/api/workspaces", { cookie: session.cookie });
      assert.equal(listResponse.status, 200);
      const listed = (await listResponse.json()).workspaces;
      assert.deepEqual(listed.map((item) => item.id), [own.id]);

      const profileResponse = await apiRequest(`/api/workspaces/${foreign.id}/business-brain`, { cookie: session.cookie });
      assert.ok(profileResponse.status === 200 || profileResponse.status === 404);
      const profilePayload = await profileResponse.json();
      assert.equal(JSON.stringify(profilePayload).includes(foreignName), false);

      const attemptedWrite = await saveBrain(session, foreign.id, {
        expectedRevision: null,
        business_name: "API cross-tenant write attempt",
        source_kind: "manual_entry",
        source_label: "negative security test",
      });
      assert.equal(attemptedWrite.status, 404, "The API must not create or modify a profile in another user's workspace.");

      const historyResponse = await apiRequest(`/api/workspaces/${foreign.id}/business-brain/history`, { cookie: session.cookie });
      assert.ok(historyResponse.status === 200 || historyResponse.status === 404);
      assert.equal(JSON.stringify(await historyResponse.json()).includes(foreignName), false);
    }
  });

  await t.test("database RLS hides foreign tenant records and rejects cross-tenant writes", async () => {
    for (const [client, own, foreign, foreignProfile, ownUserId, foreignUserId] of [
      [clientA, workspaceA, workspaceB, brainB, userA.id, userB.id],
      [clientB, workspaceB, workspaceA, brainA, userB.id, userA.id],
    ]) {
      const workspaces = await client.from("workspaces").select("id").order("created_at");
      assert.ifError(workspaces.error);
      assert.deepEqual(workspaces.data.map((item) => item.id), [own.id]);

      const hiddenProfile = await client.from("business_brain_profiles").select("business_name").eq("workspace_id", foreign.id);
      assert.ifError(hiddenProfile.error);
      assert.deepEqual(hiddenProfile.data, []);

      const hiddenHistory = await client.from("business_brain_revisions").select("id").eq("workspace_id", foreign.id);
      assert.ifError(hiddenHistory.error);
      assert.deepEqual(hiddenHistory.data, []);

      const crossUpdate = await client.from("business_brain_profiles")
        .update({ business_name: "Cross-tenant write attempt" })
        .eq("id", foreignProfile.id)
        .select("id");
      assert.ifError(crossUpdate.error);
      assert.deepEqual(crossUpdate.data, []);

      const crossInsert = await client.from("business_brain_profiles")
        .insert({ workspace_id: foreign.id, business_name: "Cross-tenant insert attempt" });
      assert.ok(crossInsert.error, "Cross-tenant profile insertion must be rejected by RLS.");
      assert.equal(crossInsert.error.code, "42501");

      const crossWorkspaceInsert = await client.from("workspaces")
        .insert({ name: "Forged workspace", created_by: foreignUserId });
      assert.ok(crossWorkspaceInsert.error, "A user must not create a workspace as another user.");
      assert.equal(crossWorkspaceInsert.error.code, "42501");

      const crossWorkspaceUpdate = await client.from("workspaces")
        .update({ name: "Unauthorized rename" })
        .eq("id", foreign.id);
      assert.ok(crossWorkspaceUpdate.error, "Authenticated users must not directly modify workspace records.");
      assert.equal(crossWorkspaceUpdate.error.code, "42501");

      const crossMembership = await client.from("workspace_members")
        .insert({ workspace_id: foreign.id, user_id: ownUserId, role: "owner" });
      assert.ok(crossMembership.error, "A user must not claim membership in another user's workspace.");
      assert.equal(crossMembership.error.code, "42501");

      const roleEscalation = await client.from("workspace_members")
        .insert({ workspace_id: own.id, user_id: ownUserId, role: "admin" });
      assert.ok(roleEscalation.error, "A user must not self-assign an admin role.");
      assert.equal(roleEscalation.error.code, "42501");

      const roleMutation = await client.from("workspace_members")
        .update({ role: "admin" })
        .eq("workspace_id", own.id)
        .eq("user_id", ownUserId);
      assert.ok(roleMutation.error, "Authenticated users must not directly edit membership roles.");
    }
  });

  const pathA = `${workspaceA.id}/verification-${runId}.txt`;
  const pathB = `${workspaceB.id}/verification-${runId}.txt`;
  const uploadA = await clientA.storage.from("business-sources").upload(pathA, new Blob(["private A"]), { contentType: "text/plain" });
  assert.ifError(uploadA.error);
  const uploadB = await clientB.storage.from("business-sources").upload(pathB, new Blob(["private B"]), { contentType: "text/plain" });
  assert.ifError(uploadB.error);

  await t.test("private Storage authorizes upload and file bytes by workspace membership", async () => {
    for (const [client, ownPath, foreignPath, foreignWorkspaceId] of [
      [clientA, pathA, pathB, workspaceB.id],
      [clientB, pathB, pathA, workspaceA.id],
    ]) {
      const ownDownload = await client.storage.from("business-sources").download(ownPath);
      assert.ifError(ownDownload.error);
      assert.ok(ownDownload.data);

      const foreignDownload = await client.storage.from("business-sources").download(foreignPath);
      assert.ok(foreignDownload.error, "A different user must not download another workspace's file.");

      const foreignUpload = await client.storage.from("business-sources").upload(
        `${foreignWorkspaceId}/unauthorized-${runId}.txt`, new Blob(["should fail"]), { contentType: "text/plain" },
      );
      assert.ok(foreignUpload.error, "A user must not upload into another workspace path.");
    }
  });

  await t.test("a valid session refreshes and Business Brain revisions persist across logout and login", async () => {
    const refreshOnlyCookie = sessionA.cookie.replace(/swapno_access=[^;]*/, "swapno_access=invalid-expired-access-token");
    const refreshedResponse = await apiRequest("/api/auth/me", { cookie: refreshOnlyCookie });
    assert.equal(refreshedResponse.status, 200, `Refresh request failed: ${await refreshedResponse.text()}`);
    sessionA.cookie = cookieHeader(refreshedResponse);

    const firstUpdate = await saveBrain(sessionA, workspaceA.id, {
      expectedRevision: 1,
      business_name: brainA.business_name,
      source_kind: "user_correction",
      source_label: "Correction in local verification",
      verification_status: "corrected",
      change_note: "Revision persistence check",
    });
    assert.equal(firstUpdate.status, 200, `Business Brain update failed: ${await firstUpdate.text()}`);

    const logout = await apiRequest("/api/auth/logout", { cookie: sessionA.cookie, method: "POST" });
    assert.equal(logout.status, 204);
    const clearedCookies = logout.headers.getSetCookie?.() ?? [];
    assert.ok(clearedCookies.length >= 2 && clearedCookies.every((cookie) => /max-age=0/i.test(cookie)), "Logout must clear both cookies.");

    const signedOutRequest = await apiRequest("/api/auth/me");
    assert.equal(signedOutRequest.status, 401, "A request without session cookies must be unauthenticated.");

    const loggedBackIn = await login(emailA);
    const persistedProfile = await apiRequest(`/api/workspaces/${workspaceA.id}/business-brain`, { cookie: loggedBackIn.cookie });
    assert.equal(persistedProfile.status, 200);
    const persisted = (await persistedProfile.json()).profile;
    assert.equal(persisted.business_name, brainA.business_name);
    assert.equal(persisted.revision, 2);
    assert.equal(persisted.verification_status, "corrected");

    const persistedHistoryResponse = await apiRequest(`/api/workspaces/${workspaceA.id}/business-brain/history`, { cookie: loggedBackIn.cookie });
    assert.equal(persistedHistoryResponse.status, 200);
    const revisions = (await persistedHistoryResponse.json()).revisions;
    assert.deepEqual(revisions.map((revision) => revision.revision), [2, 1]);
    assert.equal(revisions[0].change_note, "Revision persistence check");
  });

  await t.after(async () => {
    await clientA.storage.from("business-sources").remove([pathA]).catch(() => undefined);
    await clientB.storage.from("business-sources").remove([pathB]).catch(() => undefined);
    await clientA.auth.signOut({ scope: "local" }).catch(() => undefined);
    await clientB.auth.signOut({ scope: "local" }).catch(() => undefined);
  });
});
