import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { translate, type Language, type StringKey } from "./i18n/strings";
import { apiRequest, toErrorMessage } from "./lib/api";
import { ContentDrafts } from "./features/content-drafts/ContentDrafts";

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

interface Profile {
  id: string;
  workspace_id: string;
  business_name: string;
  industry: string;
  website: string;
  market_country: string;
  currency: string;
  timezone: string;
  default_language: Language;
  description: string;
  target_customer: string;
  value_proposition: string;
  products_services: string[];
  brand_voice: string;
  source_kind: string;
  source_label: string;
  source_url: string;
  verification_status: "unverified" | "confirmed" | "corrected";
  change_note: string;
  revision: number;
  updated_at: string;
}

interface Revision {
  id: number;
  revision: number;
  event_kind: "created" | "updated";
  source_kind: string;
  verification_status: "unverified" | "confirmed" | "corrected";
  change_note: string;
  changed_at: string;
}

interface BrainForm {
  business_name: string;
  industry: string;
  website: string;
  market_country: string;
  currency: string;
  timezone: string;
  default_language: Language;
  description: string;
  target_customer: string;
  value_proposition: string;
  products_services: string;
  brand_voice: string;
  source_kind: "manual_entry" | "external_url" | "imported_document";
  source_label: string;
  source_url: string;
  change_note: string;
}

const EMPTY_FORM: BrainForm = {
  business_name: "",
  industry: "",
  website: "",
  market_country: "BD",
  currency: "BDT",
  timezone: "Asia/Dhaka",
  default_language: "bn",
  description: "",
  target_customer: "",
  value_proposition: "",
  products_services: "",
  brand_voice: "",
  source_kind: "manual_entry",
  source_label: "",
  source_url: "",
  change_note: "",
};

const LANGUAGE_STORAGE_KEY = "swapno-ui-language";
const WORKSPACE_STORAGE_KEY = "swapno-active-workspace";

function getSavedLanguage(): Language {
  const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return value === "bn" ? "bn" : "en";
}

function profileToForm(profile: Profile | null): BrainForm {
  if (!profile) return { ...EMPTY_FORM };
  return {
    business_name: profile.business_name,
    industry: profile.industry,
    website: profile.website,
    market_country: profile.market_country,
    currency: profile.currency,
    timezone: profile.timezone,
    default_language: profile.default_language,
    description: profile.description,
    target_customer: profile.target_customer,
    value_proposition: profile.value_proposition,
    products_services: profile.products_services.join("\n"),
    brand_voice: profile.brand_voice,
    source_kind: profile.source_kind === "external_url" || profile.source_kind === "imported_document" ? profile.source_kind : "manual_entry",
    source_label: profile.source_label,
    source_url: profile.source_url,
    change_note: "",
  };
}

function formatDate(value: string, language: Language): string {
  return new Intl.DateTimeFormat(language === "bn" ? "bn-BD" : "en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function App() {
  const [language, setLanguage] = useState<Language>(getSavedLanguage);
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<Revision[]>([]);
  const [form, setForm] = useState<BrainForm>({ ...EMPTY_FORM });
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [activeView, setActiveView] = useState<"overview" | "brain" | "drafts">("overview");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const t = useCallback((key: StringKey) => translate(language, key), [language]);
  const hasWorkspace = workspaces.length > 0;
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null;
  const isSignup = authMode === "signup";
  const passwordHint = useMemo(() => t("passwordHint"), [t]);

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const loadWorkspace = useCallback(async (workspaceId: string) => {
    const [brainData, historyData] = await Promise.all([
      apiRequest<{ profile: Profile | null }>(`/api/workspaces/${encodeURIComponent(workspaceId)}/business-brain`),
      apiRequest<{ revisions: Revision[] }>(`/api/workspaces/${encodeURIComponent(workspaceId)}/business-brain/history`),
    ]);
    setProfile(brainData.profile);
    setForm(profileToForm(brainData.profile));
    setHistory(historyData.revisions);
  }, []);

  const loadAccount = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const session = await apiRequest<{ user: User }>("/api/auth/me");
      setUser(session.user);
      const result = await apiRequest<{ workspaces: Workspace[] }>("/api/workspaces");
      setWorkspaces(result.workspaces);
      const savedWorkspaceId = localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "";
      const nextWorkspace = result.workspaces.find((item) => item.id === savedWorkspaceId) ?? result.workspaces[0];
      if (nextWorkspace) {
        setActiveWorkspaceId(nextWorkspace.id);
        localStorage.setItem(WORKSPACE_STORAGE_KEY, nextWorkspace.id);
        await loadWorkspace(nextWorkspace.id);
      } else {
        setActiveWorkspaceId("");
        setProfile(null);
        setHistory([]);
        setForm({ ...EMPTY_FORM });
      }
    } catch (error) {
      const message = toErrorMessage(error);
      if (message !== "Sign in to continue.") setErrorMessage(message);
      setUser(null);
      setWorkspaces([]);
      setActiveWorkspaceId("");
      setProfile(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [loadWorkspace]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrorMessage("");
    setNotice("");
    try {
      if (isSignup) {
        const result = await apiRequest<{ user: User; confirmationRequired: boolean }>("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({ email, password, displayName }),
        });
        if (result.confirmationRequired) {
          setNotice(t("confirmationMessage"));
          setAuthMode("login");
        } else {
          await loadAccount();
        }
      } else {
        await apiRequest<{ user: User }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        await loadAccount();
      }
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message || (isSignup ? t("signupError") : t("loginError")));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    try {
      await apiRequest<void>("/api/auth/logout", { method: "POST" });
    } catch {
      // The API clears cookies even if remote token revocation is unavailable.
    } finally {
      setUser(null);
      setWorkspaces([]);
      setActiveWorkspaceId("");
      setProfile(null);
      setHistory([]);
      setBusy(false);
    }
  }

  async function handleCreateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrorMessage("");
    try {
      const result = await apiRequest<{ workspace: Workspace }>("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: workspaceName }),
      });
      const nextWorkspaces = [...workspaces, result.workspace];
      setWorkspaces(nextWorkspaces);
      setActiveWorkspaceId(result.workspace.id);
      localStorage.setItem(WORKSPACE_STORAGE_KEY, result.workspace.id);
      setWorkspaceName("");
      setWorkspaceDialogOpen(false);
      await loadWorkspace(result.workspace.id);
      setNotice(t("workspaceIntro"));
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleWorkspaceChange(workspaceId: string) {
    setActiveWorkspaceId(workspaceId);
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
    setBusy(true);
    setErrorMessage("");
    try {
      await loadWorkspace(workspaceId);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function updateForm<K extends keyof BrainForm>(key: K, value: BrainForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSaveBrain(confirm: boolean) {
    if (!activeWorkspace) return;
    setBusy(true);
    setErrorMessage("");
    setNotice("");
    const sourceKind = confirm ? "user_confirmation" : profile ? "user_correction" : form.source_kind;
    const verificationStatus = confirm ? "confirmed" : profile ? "corrected" : "unverified";

    try {
      const result = await apiRequest<{ profile: Profile }>(`/api/workspaces/${encodeURIComponent(activeWorkspace.id)}/business-brain`, {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          products_services: form.products_services.split("\n").map((item) => item.trim()).filter(Boolean),
          expectedRevision: profile?.revision ?? null,
          source_kind: sourceKind,
          verification_status: verificationStatus,
          change_note: form.change_note,
        }),
      });
      setProfile(result.profile);
      setForm(profileToForm(result.profile));
      const revisions = await apiRequest<{ revisions: Revision[] }>(`/api/workspaces/${encodeURIComponent(activeWorkspace.id)}/business-brain/history`);
      setHistory(revisions.revisions);
      setNotice(t(confirm ? "confirmSuccess" : "saveSuccess"));
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function renderLanguagePicker(compact = false) {
    return (
      <div className={`language-switch${compact ? " compact" : ""}`} role="group" aria-label={t("language")}>
        <button type="button" className={language === "en" ? "selected" : ""} onClick={() => setLanguage("en")}>EN</button>
        <button type="button" className={language === "bn" ? "selected" : ""} onClick={() => setLanguage("bn")}>বাং</button>
      </div>
    );
  }

  if (loading) {
    return <main className="loading-screen"><span className="spinner" aria-hidden="true" />{t("loading")}</main>;
  }

  if (!user) {
    return (
      <main className="auth-layout">
        <section className="auth-intro">
          <div className="brand-lockup"><span className="brand-mark">S</span><span>{t("brand")}</span></div>
          <span className="eyebrow">{t("productLabel")}</span>
          <h1>{t("welcome")}</h1>
          <p>{t("welcomeBody")}</p>
          <div className="intro-note"><span className="note-icon" aria-hidden="true">✦</span><span>{t("tagline")}</span></div>
        </section>
        <section className="auth-panel">
          <div className="auth-panel-top">{renderLanguagePicker()}</div>
          <div className="auth-card">
            <span className="eyebrow">{isSignup ? t("createAccountShort") : t("account")}</span>
            <h2>{isSignup ? t("createAccount") : t("signInTitle")}</h2>
            <p className="muted">{isSignup ? t("accountBody") : t("signInBody")}</p>
            {notice && <div className="notice" role="status">{notice}</div>}
            {errorMessage && <div className="alert" role="alert">{errorMessage}</div>}
            <form className="form-stack" onSubmit={handleAuthSubmit}>
              {isSignup && <Field label={t("name")} value={displayName} onChange={setDisplayName} required autoComplete="name" />}
              <Field label={t("email")} type="email" value={email} onChange={setEmail} required autoComplete="email" />
              <Field label={t("password")} type="password" value={password} onChange={setPassword} required autoComplete={isSignup ? "new-password" : "current-password"} minLength={isSignup ? 12 : 1} hint={isSignup ? passwordHint : undefined} />
              <button className="button button-primary button-wide" type="submit" disabled={busy}>
                {busy ? (isSignup ? t("creatingAccount") : t("signingIn")) : (isSignup ? t("createAccountShort") : t("signIn"))}
              </button>
            </form>
            <button className="text-button auth-switch" type="button" onClick={() => { setAuthMode(isSignup ? "login" : "signup"); setErrorMessage(""); setNotice(""); }}>
              {isSignup ? t("switchToLogin") : t("switchToSignup")}
            </button>
          </div>
          <p className="auth-footer">{t("footerNote")}</p>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup"><span className="brand-mark">S</span><span>{t("brand")}</span></div>
        <label className="sidebar-label" htmlFor="workspace-select">{t("workspace")}</label>
        <div className="workspace-select-wrap">
          <select id="workspace-select" value={activeWorkspaceId} onChange={(event) => void handleWorkspaceChange(event.target.value)} aria-label={t("chooseWorkspace")} disabled={!hasWorkspace || busy}>
            {workspaces.map((workspace) => <option value={workspace.id} key={workspace.id}>{workspace.name}</option>)}
            {!hasWorkspace && <option value="">{t("chooseWorkspace")}</option>}
          </select>
          <span className="select-chevron" aria-hidden="true">⌄</span>
        </div>
        <button className="sidebar-create" type="button" onClick={() => setWorkspaceDialogOpen(true)}><span aria-hidden="true">＋</span>{t("newWorkspace")}</button>
        <div className="sidebar-rule" />
        <span className="sidebar-label nav-title">{t("sidebarTitle")}</span>
        <nav className="side-nav" aria-label={t("sidebarTitle")}>
          <button className={activeView === "overview" ? "active" : ""} type="button" onClick={() => setActiveView("overview")}><span className="nav-symbol" aria-hidden="true">⌂</span>{t("overview")}</button>
          <button className={activeView === "brain" ? "active" : ""} type="button" onClick={() => setActiveView("brain")} disabled={!activeWorkspace}><span className="nav-symbol brain-symbol" aria-hidden="true">◉</span>{t("brain")}</button>
          <button className={activeView === "drafts" ? "active" : ""} type="button" onClick={() => setActiveView("drafts")} disabled={!activeWorkspace}><span className="nav-symbol" aria-hidden="true">✎</span>{language === "bn" ? "কনটেন্ট" : "Content"}</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-language">{renderLanguagePicker(true)}</div>
          <div className="sidebar-user"><span className="avatar">{(user.displayName || user.email)[0]?.toUpperCase()}</span><div className="user-copy"><strong>{user.displayName || user.email}</strong><span>{user.email}</span></div></div>
          <button className="sidebar-signout" type="button" onClick={() => void handleSignOut()} disabled={busy}>{t("signOut")}</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>{t("workspace")}</span><span aria-hidden="true">/</span><strong>{activeWorkspace?.name ?? t("chooseWorkspace")}</strong></div>
          <div className="topbar-actions">{renderLanguagePicker()}<span className="topbar-avatar" aria-label={user.displayName || user.email}>{(user.displayName || user.email)[0]?.toUpperCase()}</span></div>
        </header>

        {(errorMessage || notice) && <div className="global-message-wrap">{errorMessage && <div className="alert global-message" role="alert"><span>{errorMessage}</span><button className="message-close" type="button" onClick={() => setErrorMessage("")} aria-label={t("dismiss")}>×</button></div>}{notice && <div className="notice global-message" role="status"><span>{notice}</span><button className="message-close" type="button" onClick={() => setNotice("")} aria-label={t("dismiss")}>×</button></div>}</div>}

        {!hasWorkspace ? (
          <section className="empty-workspace content-wrap">
            <div className="empty-illustration" aria-hidden="true"><div className="empty-orbit orbit-one" /><div className="empty-orbit orbit-two" /><div className="empty-core">S</div></div>
            <span className="eyebrow">{t("workspace")}</span>
            <h1>{t("noWorkspace")}</h1>
            <p>{t("noWorkspaceBody")}</p>
            <button className="button button-primary" type="button" onClick={() => setWorkspaceDialogOpen(true)}>{t("createWorkspace")}</button>
          </section>
        ) : activeView === "overview" ? (
          <section className="overview-page content-wrap">
            <span className="eyebrow">{t("overview")}</span>
            <h1>{t("overviewTitle")}</h1>
            <p className="page-lede">{t("overviewBody")}</p>
            <div className="overview-card">
              <div className="overview-card-icon" aria-hidden="true">◉</div>
              <div className="overview-card-copy"><span className="eyebrow">{t("brainEyebrow")}</span><h2>{profile?.business_name || t("brainTitle")}</h2><p>{profile ? `${t("revision")} ${profile.revision} · ${t(profile.verification_status)}` : t("brainBody")}</p></div>
              <button className="button button-secondary" type="button" onClick={() => setActiveView("brain")}>{profile ? t("brain") : t("startBrain")}<span aria-hidden="true"> →</span></button>
            </div>
          </section>
        ) : activeView === "drafts" && activeWorkspace ? (
          <ContentDrafts workspaceId={activeWorkspace.id} language={language} />
        ) : activeWorkspace ? (
          <section className="brain-page content-wrap">
            <div className="page-heading">
              <div><span className="eyebrow">{t("brainEyebrow")}</span><h1>{t("brainTitle")}</h1><p className="page-lede">{t("brainBody")}</p></div>
              <div className={`status-chip status-${profile?.verification_status ?? "unverified"}`}><span className="status-dot" />{t(profile?.verification_status ?? "unverified")}</div>
            </div>
            <div className="last-saved">{profile ? `${t("lastSaved")} · ${formatDate(profile.updated_at, language)}` : t("neverSaved")}</div>
            <form className="brain-form" onSubmit={(event) => { event.preventDefault(); void handleSaveBrain(false); }}>
              <section className="form-section">
                <div className="section-heading"><span className="section-index">01</span><div><h2>{t("profileSection")}</h2><p>{t("profileSectionBody")}</p></div></div>
                <div className="field-grid">
                  <Field label={t("businessName")} value={form.business_name} onChange={(value) => updateForm("business_name", value)} required className="field-full" />
                  <Field label={t("industry")} value={form.industry} onChange={(value) => updateForm("industry", value)} />
                  <Field label={t("website")} type="url" value={form.website} onChange={(value) => updateForm("website", value)} placeholder="https://" />
                  <Field label={t("country")} value={form.market_country} onChange={(value) => updateForm("market_country", value)} />
                  <Field label={t("currency")} value={form.currency} onChange={(value) => updateForm("currency", value.toUpperCase())} maxLength={3} />
                  <Field label={t("timezone")} value={form.timezone} onChange={(value) => updateForm("timezone", value)} />
                  <label className="field"><span>{t("preferredLanguage")}</span><select value={form.default_language} onChange={(event) => updateForm("default_language", event.target.value as Language)}><option value="bn">{t("languageBangla")}</option><option value="en">{t("languageEnglish")}</option></select></label>
                  <Field label={t("description")} value={form.description} onChange={(value) => updateForm("description", value)} placeholder={t("descriptionHint")} multiline rows={3} className="field-full" />
                  <Field label={t("targetCustomer")} value={form.target_customer} onChange={(value) => updateForm("target_customer", value)} placeholder={t("targetCustomerHint")} multiline rows={3} />
                  <Field label={t("valueProposition")} value={form.value_proposition} onChange={(value) => updateForm("value_proposition", value)} multiline rows={3} />
                  <Field label={t("productsServices")} value={form.products_services} onChange={(value) => updateForm("products_services", value)} placeholder={t("productsHint")} multiline rows={4} hint={t("productsHint")} />
                  <Field label={t("brandVoice")} value={form.brand_voice} onChange={(value) => updateForm("brand_voice", value)} placeholder={t("brandVoiceHint")} multiline rows={4} />
                </div>
              </section>

              <section className="form-section source-section">
                <div className="section-heading"><span className="section-index">02</span><div><h2>{t("sourceSection")}</h2><p>{t("sourceBody")}</p></div></div>
                <div className="field-grid">
                  <label className="field"><span>{t("sourceType")}</span><select value={form.source_kind} onChange={(event) => updateForm("source_kind", event.target.value as BrainForm["source_kind"])}><option value="manual_entry">{t("sourceManual")}</option><option value="external_url">{t("sourceWebsite")}</option><option value="imported_document">{t("sourceDocument")}</option></select></label>
                  <Field label={t("sourceLabel")} value={form.source_label} onChange={(value) => updateForm("source_label", value)} placeholder={t("sourceLabelHint")} />
                  <Field label={t("sourceUrl")} type="url" value={form.source_url} onChange={(value) => updateForm("source_url", value)} placeholder="https://" hint={t("sourceUrlHint")} className="field-full" />
                  <label className="field"><span>{t("verification")}</span><input value={t(profile?.verification_status ?? "unverified")} readOnly aria-readonly="true" /></label>
                  <Field label={t("changeNote")} value={form.change_note} onChange={(value) => updateForm("change_note", value)} placeholder={t("changeNoteHint")} />
                </div>
              </section>

              <div className="form-actions"><span className="muted action-hint">{t("footerNote")}</span><div className="action-buttons"><button className="button button-secondary" type="submit" disabled={busy || !form.business_name.trim()}>{busy ? t("saving") : t("saveDraft")}</button><button className="button button-primary" type="button" disabled={busy || !form.business_name.trim()} onClick={(event) => { const formElement = event.currentTarget.form; if (formElement?.reportValidity()) void handleSaveBrain(true); }}>{t("confirmDetails")}</button></div></div>
            </form>

            <section className="history-section">
              <div className="section-heading"><span className="section-index">↺</span><div><h2>{t("history")}</h2><p>{t("historyBody")}</p></div></div>
              {history.length === 0 ? <p className="empty-history">{t("emptyHistory")}</p> : <ol className="history-list">{history.map((revision) => <li key={revision.id}><span className="timeline-dot" /><div className="history-entry"><div className="history-entry-top"><strong>{t("revision")} {revision.revision}</strong><span className={`status-text status-text-${revision.verification_status}`}>{t(revision.verification_status)}</span></div><p>{t(revision.event_kind === "created" ? "created" : "updated")} · {t(revision.source_kind === "user_confirmation" ? "confirmed" : revision.source_kind === "user_correction" ? "corrected" : "sourceManual")}</p>{revision.change_note && <p>{revision.change_note}</p>}<time dateTime={revision.changed_at}>{formatDate(revision.changed_at, language)}</time></div></li>)}</ol>}
            </section>
          </section>
        ) : null}
      </main>

      {workspaceDialogOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setWorkspaceDialogOpen(false); }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="workspace-dialog-title"><button className="dialog-close" type="button" onClick={() => setWorkspaceDialogOpen(false)} aria-label={t("dismiss")}>×</button><span className="eyebrow">{t("workspace")}</span><h2 id="workspace-dialog-title">{t("newWorkspace")}</h2><p className="muted">{t("workspaceIntro")}</p><form className="form-stack" onSubmit={(event) => void handleCreateWorkspace(event)}><Field label={t("workspaceName")} value={workspaceName} onChange={setWorkspaceName} required autoFocus maxLength={80} /><button className="button button-primary button-wide" type="submit" disabled={busy || !workspaceName.trim()}>{busy ? t("creatingWorkspace") : t("createWorkspace")}</button></form></section></div>}
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
}

function Field({ label, value, onChange, type = "text", required = false, autoComplete, autoFocus, minLength, maxLength, placeholder, hint, multiline, rows = 4, className = "" }: FieldProps) {
  const id = useId();
  return (
    <label className={`field ${className}`} htmlFor={id}>
      <span>{label}{required && <span className="required-mark" aria-label="required"> *</span>}</span>
      {multiline ? <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} rows={rows} required={required} maxLength={maxLength} placeholder={placeholder} /> : <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} autoComplete={autoComplete} autoFocus={autoFocus} minLength={minLength} maxLength={maxLength} placeholder={placeholder} />}
      {hint && <small>{hint}</small>}
    </label>
  );
}
