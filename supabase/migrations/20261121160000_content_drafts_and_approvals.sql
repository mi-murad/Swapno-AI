-- Persistent content drafts with immutable revision snapshots and version-specific approvals.
create table public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  platform text not null default 'general' check (platform in ('general','facebook','instagram','linkedin','tiktok','youtube')),
  content_type text not null default 'post' check (content_type in ('post','caption','story','reel_script','video_script','ad_copy')),
  language text not null default 'bn' check (language in ('en','bn')),
  body text not null default '' check (char_length(body) <= 20000),
  status text not null default 'draft' check (status in ('draft','archived')),
  revision integer not null default 1 check (revision > 0),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create index content_drafts_workspace_updated
  on public.content_drafts(workspace_id, updated_at desc);

create table public.content_draft_revisions (
  id bigint generated always as identity primary key,
  draft_id uuid not null,
  workspace_id uuid not null,
  revision integer not null check (revision > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (draft_id, workspace_id, revision),
  foreign key (draft_id, workspace_id)
    references public.content_drafts(id, workspace_id) on delete cascade
);

create index content_draft_revisions_workspace
  on public.content_draft_revisions(workspace_id, draft_id, revision desc);

create table public.content_approvals (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null,
  workspace_id uuid not null,
  revision integer not null,
  decision text not null check (decision in ('approved','changes_requested')),
  note text not null default '' check (char_length(note) <= 2000),
  decided_by uuid not null references auth.users(id),
  decided_at timestamptz not null default now(),
  unique (draft_id, revision),
  foreign key (draft_id, workspace_id, revision)
    references public.content_draft_revisions(draft_id, workspace_id, revision) on delete cascade
);

create index content_approvals_workspace
  on public.content_approvals(workspace_id, draft_id, revision desc);

alter table public.content_drafts enable row level security;
alter table public.content_draft_revisions enable row level security;
alter table public.content_approvals enable row level security;

create policy "Workspace members can read content drafts"
  on public.content_drafts for select to authenticated
  using (exists (
    select 1 from public.workspace_members as membership
    where membership.workspace_id = content_drafts.workspace_id
      and membership.user_id = (select auth.uid())
  ));

create policy "Workspace members can create content drafts"
  on public.content_drafts for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and updated_by = (select auth.uid())
    and exists (
      select 1 from public.workspace_members as membership
      where membership.workspace_id = content_drafts.workspace_id
        and membership.user_id = (select auth.uid())
    )
  );

create policy "Workspace members can update content drafts"
  on public.content_drafts for update to authenticated
  using (exists (
    select 1 from public.workspace_members as membership
    where membership.workspace_id = content_drafts.workspace_id
      and membership.user_id = (select auth.uid())
  ))
  with check (
    updated_by = (select auth.uid())
    and exists (
      select 1 from public.workspace_members as membership
      where membership.workspace_id = content_drafts.workspace_id
        and membership.user_id = (select auth.uid())
    )
  );

create policy "Workspace members can read content draft revisions"
  on public.content_draft_revisions for select to authenticated
  using (exists (
    select 1 from public.workspace_members as membership
    where membership.workspace_id = content_draft_revisions.workspace_id
      and membership.user_id = (select auth.uid())
  ));

create policy "Workspace members can read content approvals"
  on public.content_approvals for select to authenticated
  using (exists (
    select 1 from public.workspace_members as membership
    where membership.workspace_id = content_approvals.workspace_id
      and membership.user_id = (select auth.uid())
  ));

create policy "Members can approve only the current draft revision"
  on public.content_approvals for insert to authenticated
  with check (
    decided_by = (select auth.uid())
    and exists (
      select 1
      from public.content_drafts as draft
      join public.workspace_members as membership
        on membership.workspace_id = draft.workspace_id
       and membership.user_id = (select auth.uid())
      where draft.id = content_approvals.draft_id
        and draft.workspace_id = content_approvals.workspace_id
        and draft.revision = content_approvals.revision
    )
  );

revoke all on public.content_drafts, public.content_draft_revisions, public.content_approvals from anon, authenticated;
grant select on public.content_drafts, public.content_draft_revisions, public.content_approvals to authenticated;
grant insert (workspace_id, title, platform, content_type, language, body, status)
  on public.content_drafts to authenticated;
grant update (title, platform, content_type, language, body, status)
  on public.content_drafts to authenticated;
grant insert (draft_id, workspace_id, revision, decision, note, decided_by)
  on public.content_approvals to authenticated;

create or replace function private.set_content_draft_metadata()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.revision := 1;
    new.created_by := (select auth.uid());
    new.updated_by := (select auth.uid());
    new.created_at := now();
  else
    if new.workspace_id is distinct from old.workspace_id
      or new.created_by is distinct from old.created_by
      or new.id is distinct from old.id then
      raise exception 'Draft identity and workspace are immutable' using errcode = '42501';
    end if;
    new.revision := old.revision + 1;
    new.updated_by := (select auth.uid());
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

create or replace function private.capture_content_draft_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.content_draft_revisions (
    draft_id, workspace_id, revision, snapshot, created_by
  ) values (
    new.id, new.workspace_id, new.revision, to_jsonb(new), new.updated_by
  );
  return new;
end;
$function$;

revoke all on function private.set_content_draft_metadata() from public, anon, authenticated;
revoke all on function private.capture_content_draft_revision() from public, anon, authenticated;

create trigger content_draft_metadata
  before insert or update on public.content_drafts
  for each row execute function private.set_content_draft_metadata();

create trigger content_draft_revision
  after insert or update on public.content_drafts
  for each row execute function private.capture_content_draft_revision();
