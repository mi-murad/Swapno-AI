-- Keep the project's public-schema RLS event trigger, but remove its REST/RPC
-- execution grants when that project-level helper is present.
do $migration$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end
$migration$;

create schema if not exists private;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_by_user on public.workspace_members (user_id, workspace_id);

create table public.business_brain_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  business_name text not null check (char_length(btrim(business_name)) between 1 and 160),
  industry text not null default '' check (char_length(industry) <= 120),
  website text not null default '' check (char_length(website) <= 2048),
  market_country text not null default 'BD' check (char_length(market_country) between 2 and 80),
  currency text not null default 'BDT' check (char_length(currency) = 3),
  timezone text not null default 'Asia/Dhaka' check (char_length(timezone) between 1 and 80),
  default_language text not null default 'bn' check (default_language in ('en', 'bn')),
  description text not null default '' check (char_length(description) <= 4000),
  target_customer text not null default '' check (char_length(target_customer) <= 2000),
  value_proposition text not null default '' check (char_length(value_proposition) <= 2000),
  products_services jsonb not null default '[]'::jsonb check (jsonb_typeof(products_services) = 'array'),
  brand_voice text not null default '' check (char_length(brand_voice) <= 2000),
  source_kind text not null default 'manual_entry'
    check (source_kind in ('manual_entry', 'external_url', 'imported_document', 'user_correction', 'user_confirmation')),
  source_label text not null default '' check (char_length(source_label) <= 300),
  source_url text not null default '' check (char_length(source_url) <= 2048),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'confirmed', 'corrected')),
  change_note text not null default '' check (char_length(change_note) <= 500),
  revision integer not null default 1 check (revision > 0),
  created_by uuid not null references auth.users (id),
  updated_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create table public.business_brain_revisions (
  id bigint generated always as identity primary key,
  profile_id uuid not null,
  workspace_id uuid not null,
  revision integer not null check (revision > 0),
  event_kind text not null check (event_kind in ('created', 'updated')),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  source_kind text not null,
  verification_status text not null,
  change_note text not null default '',
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now(),
  unique (profile_id, revision),
  foreign key (profile_id, workspace_id)
    references public.business_brain_profiles (id, workspace_id) on delete cascade
);

create index business_brain_revisions_workspace on public.business_brain_revisions (workspace_id, profile_id, revision desc);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.business_brain_profiles enable row level security;
alter table public.business_brain_revisions enable row level security;

create policy "Workspace members can read their workspaces"
  on public.workspaces for select to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.workspace_members as membership
      where membership.workspace_id = workspaces.id
        and membership.user_id = (select auth.uid())
    )
  );

create policy "A user can create only their own workspace"
  on public.workspaces for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "Users can read only their own membership rows"
  on public.workspace_members for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Workspace members can read business profiles"
  on public.business_brain_profiles for select to authenticated
  using (
    exists (
      select 1 from public.workspace_members as membership
      where membership.workspace_id = business_brain_profiles.workspace_id
        and membership.user_id = (select auth.uid())
    )
  );

create policy "Workspace members can create business profiles"
  on public.business_brain_profiles for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and updated_by = (select auth.uid())
    and exists (
      select 1 from public.workspace_members as membership
      where membership.workspace_id = business_brain_profiles.workspace_id
        and membership.user_id = (select auth.uid())
    )
  );

create policy "Workspace members can update business profiles"
  on public.business_brain_profiles for update to authenticated
  using (
    exists (
      select 1 from public.workspace_members as membership
      where membership.workspace_id = business_brain_profiles.workspace_id
        and membership.user_id = (select auth.uid())
    )
  )
  with check (
    updated_by = (select auth.uid())
    and exists (
      select 1 from public.workspace_members as membership
      where membership.workspace_id = business_brain_profiles.workspace_id
        and membership.user_id = (select auth.uid())
    )
  );

create policy "Workspace members can read business profile history"
  on public.business_brain_revisions for select to authenticated
  using (
    exists (
      select 1 from public.workspace_members as membership
      where membership.workspace_id = business_brain_revisions.workspace_id
        and membership.user_id = (select auth.uid())
    )
  );

revoke all on public.workspaces from anon, authenticated;
revoke all on public.workspace_members from anon, authenticated;
revoke all on public.business_brain_profiles from anon, authenticated;
revoke all on public.business_brain_revisions from anon, authenticated;

grant select, insert on public.workspaces to authenticated;
grant select on public.workspace_members to authenticated;
grant select on public.business_brain_profiles to authenticated;
grant insert (
  workspace_id, business_name, industry, website, market_country, currency,
  timezone, default_language, description, target_customer, value_proposition,
  products_services, brand_voice, source_kind, source_label, source_url,
  verification_status, change_note
) on public.business_brain_profiles to authenticated;
grant update (
  business_name, industry, website, market_country, currency, timezone,
  default_language, description, target_customer, value_proposition,
  products_services, brand_voice, source_kind, source_label, source_url,
  verification_status, change_note
) on public.business_brain_profiles to authenticated;
grant select on public.business_brain_revisions to authenticated;

create or replace function public.create_workspace(workspace_name text)
returns table (workspace_id uuid, name text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  new_workspace public.workspaces;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if workspace_name is null or char_length(btrim(workspace_name)) not between 1 and 80 then
    raise exception 'Workspace name must be between 1 and 80 characters' using errcode = '22023';
  end if;

  insert into public.workspaces (name, created_by)
  values (btrim(workspace_name), (select auth.uid()))
  returning * into new_workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace.id, (select auth.uid()), 'owner');

  return query select new_workspace.id, new_workspace.name, new_workspace.created_at;
end;
$function$;

revoke all on function public.create_workspace(text) from public, anon, service_role;
grant execute on function public.create_workspace(text) to authenticated;

create or replace function private.set_business_brain_metadata()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if auth.uid() is null and current_user not in ('postgres', 'service_role') then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.revision := 1;
    new.created_by := coalesce((select auth.uid()), new.created_by);
    new.updated_by := coalesce((select auth.uid()), new.updated_by, new.created_by);
    new.created_at := now();
  else
    if new.workspace_id is distinct from old.workspace_id or new.created_by is distinct from old.created_by then
      raise exception 'Workspace and creator are immutable' using errcode = '42501';
    end if;
    new.revision := old.revision + 1;
    new.updated_by := coalesce((select auth.uid()), old.updated_by);
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

create or replace function private.capture_business_brain_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.business_brain_revisions (
    profile_id, workspace_id, revision, event_kind, snapshot,
    source_kind, verification_status, change_note, changed_by
  ) values (
    new.id, new.workspace_id, new.revision,
    case when tg_op = 'INSERT' then 'created' else 'updated' end,
    to_jsonb(new), new.source_kind, new.verification_status,
    new.change_note, coalesce((select auth.uid()), new.updated_by)
  );
  return new;
end;
$function$;

revoke all on function private.set_business_brain_metadata() from public, anon, authenticated;
revoke all on function private.capture_business_brain_revision() from public, anon, authenticated;

create trigger business_brain_metadata
  before insert or update on public.business_brain_profiles
  for each row execute function private.set_business_brain_metadata();

create trigger business_brain_revision
  after insert or update on public.business_brain_profiles
  for each row execute function private.capture_business_brain_revision();

insert into storage.buckets (id, name, public, file_size_limit)
values ('business-sources', 'business-sources', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy "Workspace members can read private business sources"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'business-sources'
    and (storage.foldername(name))[1] in (
      select membership.workspace_id::text
      from public.workspace_members as membership
      where membership.user_id = (select auth.uid())
    )
  );

create policy "Workspace members can upload private business sources"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'business-sources'
    and (storage.foldername(name))[1] in (
      select membership.workspace_id::text
      from public.workspace_members as membership
      where membership.user_id = (select auth.uid())
    )
  );

create policy "Workspace members can update private business sources"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'business-sources'
    and (storage.foldername(name))[1] in (
      select membership.workspace_id::text
      from public.workspace_members as membership
      where membership.user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'business-sources'
    and (storage.foldername(name))[1] in (
      select membership.workspace_id::text
      from public.workspace_members as membership
      where membership.user_id = (select auth.uid())
    )
  );

create policy "Workspace members can delete private business sources"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'business-sources'
    and (storage.foldername(name))[1] in (
      select membership.workspace_id::text
      from public.workspace_members as membership
      where membership.user_id = (select auth.uid())
    )
  );
