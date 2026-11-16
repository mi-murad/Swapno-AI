begin;
select plan(9);

insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000001', 'rls-user-one@example.test', now(), '{}', '{}'),
  ('20000000-0000-4000-8000-000000000002', 'rls-user-two@example.test', now(), '{}', '{}');

insert into public.workspaces (id, name, created_by)
values
  ('a0000000-0000-4000-8000-000000000001', 'User One Workspace', '10000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000002', 'User Two Workspace', '20000000-0000-4000-8000-000000000002');

insert into public.workspace_members (workspace_id, user_id, role)
values
  ('a0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner'),
  ('b0000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'owner');

insert into public.business_brain_profiles (
  workspace_id, business_name, created_by, updated_by, source_kind, verification_status
)
values
  ('a0000000-0000-4000-8000-000000000001', 'User One Shop', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'manual_entry', 'confirmed'),
  ('b0000000-0000-4000-8000-000000000002', 'User Two Shop', '20000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'manual_entry', 'confirmed');

insert into storage.objects (bucket_id, name)
values ('business-sources', 'b0000000-0000-4000-8000-000000000002/private.txt');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is((select count(*)::integer from public.workspaces), 1, 'User one sees only their workspace');
select is((select count(*)::integer from public.business_brain_profiles where workspace_id = 'b0000000-0000-4000-8000-000000000002'), 0, 'User one cannot read user two Business Brain');
select is((select count(*)::integer from public.business_brain_revisions where workspace_id = 'b0000000-0000-4000-8000-000000000002'), 0, 'User one cannot read user two history');
select is((select count(*)::integer from public.workspace_members), 1, 'User one cannot enumerate another user membership');
select is((select count(*)::integer from storage.objects where name like 'b0000000-%'), 0, 'User one cannot read user two private storage metadata');
select throws_ok(
  $$insert into public.business_brain_profiles (workspace_id, business_name, created_by, updated_by) values ('b0000000-0000-4000-8000-000000000002', 'Intrusion', auth.uid(), auth.uid())$$,
  '42501', null, 'User one cannot insert data into user two workspace'
);
select throws_ok(
  $$update public.business_brain_profiles set workspace_id = 'b0000000-0000-4000-8000-000000000002' where workspace_id = 'a0000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'User one cannot move their data into user two workspace'
);

select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*)::integer from public.workspaces), 1, 'User two sees only their workspace');
select is((select count(*)::integer from public.business_brain_profiles where workspace_id = 'a0000000-0000-4000-8000-000000000001'), 0, 'User two cannot read user one Business Brain');

reset role;
select * from finish();
rollback;
