begin;
select plan(8);

insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('30000000-0000-4000-8000-000000000003', 'draft-user-one@example.test', now(), '{}', '{}'),
  ('40000000-0000-4000-8000-000000000004', 'draft-user-two@example.test', now(), '{}', '{}');

insert into public.workspaces (id, name, created_by)
values
  ('c0000000-0000-4000-8000-000000000003', 'Draft User One', '30000000-0000-4000-8000-000000000003'),
  ('d0000000-0000-4000-8000-000000000004', 'Draft User Two', '40000000-0000-4000-8000-000000000004');

insert into public.workspace_members (workspace_id, user_id, role)
values
  ('c0000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'owner'),
  ('d0000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', 'owner');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

insert into public.content_drafts (workspace_id, title, platform, content_type, language, body)
values ('c0000000-0000-4000-8000-000000000003', 'First campaign draft', 'facebook', 'post', 'bn', 'Version one');

select is((select count(*)::integer from public.content_draft_revisions), 1, 'Creating a draft records its first immutable revision');
select is((select revision from public.content_drafts where title = 'First campaign draft'), 1, 'New draft begins at revision one');

insert into public.content_approvals (draft_id, workspace_id, revision, decision, note, decided_by)
select id, workspace_id, revision, 'approved', 'Reviewed version one', auth.uid()
from public.content_drafts where title = 'First campaign draft';

update public.content_drafts set body = 'Version two'
where title = 'First campaign draft';

select is((select revision from public.content_drafts where title = 'First campaign draft'), 2, 'Editing a draft increments its revision');
select is((select count(*)::integer from public.content_draft_revisions), 2, 'Editing a draft records a second immutable revision');
select is((
  select count(*)::integer
  from public.content_approvals approval
  join public.content_drafts draft on draft.id = approval.draft_id
  where approval.revision = 1 and draft.revision = 2
), 1, 'Approval remains attached to the exact older revision');
select is((
  select count(*)::integer
  from public.content_approvals approval
  join public.content_drafts draft on draft.id = approval.draft_id
  where approval.revision = draft.revision
), 0, 'An edited revision is not silently approved');

select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is((select count(*)::integer from public.content_drafts), 0, 'Another workspace cannot read these content drafts');
select is((select count(*)::integer from public.content_draft_revisions), 0, 'Another workspace cannot read these content revisions');

reset role;
select * from finish();
rollback;
