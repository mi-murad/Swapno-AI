import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiRequest, toErrorMessage } from "../../lib/api";
import type { Language } from "../../i18n/strings";

interface Draft {
  id: string;
  title: string;
  platform: string;
  content_type: string;
  language: Language;
  body: string;
  status: "draft" | "archived";
  revision: number;
  updated_at: string;
}
interface Approval {
  id: string;
  draft_id: string;
  revision: number;
  decision: "approved" | "changes_requested";
  note: string;
  decided_at: string;
}
interface Revision {
  id: number;
  revision: number;
  snapshot: Draft;
  created_at: string;
}
interface Props { workspaceId: string; language: Language; }

const copy = {
  en: {
    title: "Content drafts", intro: "Create, revise and approve content. Every approval is tied to one exact revision.",
    newDraft: "New draft", draftTitle: "Draft title", platform: "Platform", type: "Content type", status: "Status",
    language: "Content language", body: "Content", save: "Save draft", create: "Create draft",
    approve: "Approve this revision", history: "Revision history", noDrafts: "No content drafts yet.",
    select: "Select a draft", revision: "Revision", approved: "Approved", changes: "Changes requested",
    current: "Current revision", stale: "An older revision was approved; this revision still needs review.",
    saved: "Draft saved.", created: "Draft created.", approvalSaved: "Decision recorded.",
    error: "Something went wrong.", archived: "Archived", draft: "Draft", loading: "Loading…",
    saveConflict: "This draft changed elsewhere. Reload and review the latest revision.",
    approvalConflict: "This revision already has a decision, or is no longer current.",
  },
  bn: {
    title: "কনটেন্ট ড্রাফট", intro: "কনটেন্ট তৈরি, সংশোধন ও অনুমোদন করুন। প্রতিটি অনুমোদন নির্দিষ্ট সংস্করণের সঙ্গে যুক্ত থাকে।",
    newDraft: "নতুন ড্রাফট", draftTitle: "ড্রাফটের শিরোনাম", platform: "প্ল্যাটফর্ম", type: "কনটেন্টের ধরন", status: "অবস্থা",
    language: "কনটেন্টের ভাষা", body: "কনটেন্ট", save: "ড্রাফট সংরক্ষণ", create: "ড্রাফট তৈরি",
    approve: "এই সংস্করণ অনুমোদন করুন", history: "সংস্করণের ইতিহাস", noDrafts: "এখনও কোনো কনটেন্ট ড্রাফট নেই।",
    select: "একটি ড্রাফট বেছে নিন", revision: "সংস্করণ", approved: "অনুমোদিত", changes: "সংশোধন প্রয়োজন",
    current: "বর্তমান সংস্করণ", stale: "আগের সংস্করণ অনুমোদিত হয়েছিল; এই সংস্করণে নতুন পর্যালোচনা প্রয়োজন।",
    saved: "ড্রাফট সংরক্ষিত হয়েছে।", created: "ড্রাফট তৈরি হয়েছে।", approvalSaved: "সিদ্ধান্ত সংরক্ষিত হয়েছে।",
    error: "একটি সমস্যা হয়েছে।", archived: "আর্কাইভ", draft: "ড্রাফট", loading: "লোড হচ্ছে…",
    saveConflict: "অন্য কোথাও ড্রাফটটি পরিবর্তিত হয়েছে। সর্বশেষ সংস্করণ লোড করে পর্যালোচনা করুন।",
    approvalConflict: "এই সংস্করণে আগেই সিদ্ধান্ত হয়েছে অথবা এটি আর বর্তমান সংস্করণ নয়।",
  },
} as const;

const platforms = ["general", "facebook", "instagram", "linkedin", "tiktok", "youtube"];
const types = ["post", "caption", "story", "reel_script", "video_script", "ad_copy"];

export function ContentDrafts({ workspaceId, language }: Props) {
  const t = copy[language];
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("general");
  const [contentType, setContentType] = useState("post");
  const [contentLanguage, setContentLanguage] = useState<Language>(language);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"draft" | "archived">("draft");
  const [revision, setRevision] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiRequest<{ drafts: Draft[]; approvals: Approval[] }>(`/api/workspaces/${workspaceId}/content-drafts`);
      setDrafts(result.drafts);
      setApprovals(result.approvals);
      setSelectedId((current) => result.drafts.some((draft) => draft.id === current) ? current : result.drafts[0]?.id ?? "");
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void load(); }, [load]);

  const selected = drafts.find((draft) => draft.id === selectedId) ?? null;
  const selectedApproval = selected ? approvals.find((item) => item.draft_id === selected.id && item.revision === selected.revision) : undefined;

  useEffect(() => {
    if (!selected) {
      setTitle(""); setPlatform("general"); setContentType("post"); setContentLanguage(language);
      setBody(""); setStatus("draft"); setRevision(null); setRevisions([]);
      return;
    }
    setTitle(selected.title); setPlatform(selected.platform); setContentType(selected.content_type);
    setContentLanguage(selected.language); setBody(selected.body); setStatus(selected.status);
    setRevision(selected.revision);
    void apiRequest<{ revisions: Revision[] }>(`/api/workspaces/${workspaceId}/content-drafts/${selected.id}/revisions`)
      .then((result) => setRevisions(result.revisions))
      .catch((caught) => setError(toErrorMessage(caught)));
  }, [selectedId, selected?.revision, workspaceId, language]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      if (selected) {
        await apiRequest(`/api/workspaces/${workspaceId}/content-drafts/${selected.id}`, {
          method: "PUT",
          body: JSON.stringify({ expectedRevision: revision, title, platform, content_type: contentType, language: contentLanguage, body, status }),
        });
        setMessage(t.saved);
      } else {
        const result = await apiRequest<{ draft: Draft }>(`/api/workspaces/${workspaceId}/content-drafts`, {
          method: "POST",
          body: JSON.stringify({ title, platform, content_type: contentType, language: contentLanguage, body, status }),
        });
        setSelectedId(result.draft.id);
        setMessage(t.created);
      }
      await load();
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!selected) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/content-drafts/${selected.id}/approvals`, {
        method: "POST",
        body: JSON.stringify({ revision: selected.revision, decision: "approved", note: "" }),
      });
      setMessage(t.approvalSaved);
      await load();
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return <section className="content-drafts-page">
    <div className="page-heading">
      <div><span className="eyebrow">SWAPNO AI</span><h1>{t.title}</h1><p className="page-lede">{t.intro}</p></div>
      <button className="button button-primary" type="button" onClick={() => setSelectedId("")}>{t.newDraft}</button>
    </div>
    {(error || message) && <p className={error ? "alert" : "notice"} role={error ? "alert" : "status"}>{error || message}</p>}
    {loading ? <p className="muted">{t.loading}</p> : <div className="drafts-layout">
      <aside className="draft-list" aria-label={t.title}>
        {drafts.length === 0 ? <p className="muted">{t.noDrafts}</p> : drafts.map((draft) => {
          const approval = approvals.find((item) => item.draft_id === draft.id && item.revision === draft.revision);
          return <button key={draft.id} type="button" className={selectedId === draft.id ? "draft-list-item selected" : "draft-list-item"} onClick={() => setSelectedId(draft.id)}>
            <strong>{draft.title}</strong><span>{t.revision} {draft.revision} · {approval?.decision === "approved" ? t.approved : draft.status === "archived" ? t.archived : t.draft}</span>
          </button>;
        })}
      </aside>
      <div className="draft-editor">
        <form className="brain-form" onSubmit={(event) => void save(event)}>
          <section className="form-section"><div className="field-grid">
            <label className="field field-full"><span>{t.draftTitle}</span><input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} /></label>
            <label className="field"><span>{t.platform}</span><select value={platform} onChange={(event) => setPlatform(event.target.value)}>{platforms.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="field"><span>{t.type}</span><select value={contentType} onChange={(event) => setContentType(event.target.value)}>{types.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
            <label className="field"><span>{t.language}</span><select value={contentLanguage} onChange={(event) => setContentLanguage(event.target.value as Language)}><option value="bn">বাংলা</option><option value="en">English</option></select></label>
            <label className="field"><span>{t.status}</span><select value={status} onChange={(event) => setStatus(event.target.value as "draft" | "archived")}><option value="draft">{t.draft}</option><option value="archived">{t.archived}</option></select></label>
            <label className="field field-full"><span>{t.body}</span><textarea value={body} onChange={(event) => setBody(event.target.value)} rows={12} maxLength={20000} /></label>
          </div></section>
          <div className="form-actions"><span className="muted action-hint">{selected ? `${t.current}: ${selected.revision}` : t.newDraft}</span><div className="action-buttons">
            <button className="button button-secondary" type="submit" disabled={busy || !title.trim()}>{busy ? t.loading : selected ? t.save : t.create}</button>
            {selected && !selectedApproval && selected.status === "draft" && <button className="button button-primary" type="button" onClick={() => void approve()} disabled={busy}>{t.approve}</button>}
          </div></div>
        </form>
        {selected && <section className="history-section"><div className="section-heading"><span className="section-index">↺</span><div><h2>{t.history}</h2><p>{t.intro}</p></div></div>
          {selectedApproval && <p className="notice">{selectedApproval.decision === "approved" ? t.approved : t.changes} · {t.revision} {selectedApproval.revision}</p>}
          {revisions.map((item) => <article className="draft-revision" key={item.id}><strong>{t.revision} {item.revision}</strong><span>{new Date(item.created_at).toLocaleString(language === "bn" ? "bn-BD" : "en-BD")}</span><p>{item.snapshot.title}</p></article>)}
        </section>}
      </div>
    </div>}
  </section>;
}
