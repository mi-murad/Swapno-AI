create or replace function private.is_workspace_creator(target_workspace_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    return false;
  end if;

  return exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = target_workspace_id
      and workspace.created_by = (select auth.uid())
  );
end;
$function$;

revoke all on function private.is_workspace_creator(uuid) from public, anon, service_role;
grant execute on function private.is_workspace_creator(uuid) to authenticated;
grant usage on schema private to authenticated;

create policy "A workspace creator can add their own owner membership"
  on public.workspace_members for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'owner'
    and private.is_workspace_creator(workspace_id)
  );

grant insert on public.workspace_members to authenticated;

create or replace function public.create_workspace(workspace_name text)
returns table (workspace_id uuid, name text, created_at timestamptz)
language plpgsql
security invoker
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
