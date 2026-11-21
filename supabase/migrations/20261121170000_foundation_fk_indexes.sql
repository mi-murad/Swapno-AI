-- Cover every child-side foreign key flagged by the hosted performance advisor.
-- These indexes make FK checks and user/workspace deletion or joins predictable.
create index if not exists workspaces_created_by_idx
  on public.workspaces (created_by);

create index if not exists business_brain_profiles_created_by_idx
  on public.business_brain_profiles (created_by);

create index if not exists business_brain_profiles_updated_by_idx
  on public.business_brain_profiles (updated_by);

create index if not exists business_brain_revisions_changed_by_idx
  on public.business_brain_revisions (changed_by);

create index if not exists business_brain_revisions_profile_workspace_idx
  on public.business_brain_revisions (profile_id, workspace_id);
