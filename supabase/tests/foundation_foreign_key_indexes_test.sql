begin;
select plan(5);

select ok(to_regclass('public.workspaces_created_by_idx') is not null, 'workspaces creator foreign key is indexed');
select ok(to_regclass('public.business_brain_profiles_created_by_idx') is not null, 'Business Brain creator foreign key is indexed');
select ok(to_regclass('public.business_brain_profiles_updated_by_idx') is not null, 'Business Brain updater foreign key is indexed');
select ok(to_regclass('public.business_brain_revisions_changed_by_idx') is not null, 'Business Brain revision actor foreign key is indexed');
select ok(to_regclass('public.business_brain_revisions_profile_workspace_idx') is not null, 'Business Brain revision composite foreign key is indexed');

select * from finish();
rollback;
