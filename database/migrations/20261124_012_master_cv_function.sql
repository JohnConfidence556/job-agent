create function public.create_master_cv_version(
  p_user_id uuid,
  p_content jsonb,
  p_source_file_path text default null
)
returns public.master_cvs
language plpgsql
set search_path = ''
as $$
declare
  next_version integer;
  new_row public.master_cvs;
begin
  select coalesce(max(version), 0) + 1
    into next_version
    from public.master_cvs
    where user_id = p_user_id;

  update public.master_cvs
    set is_current = false
    where user_id = p_user_id and is_current;

  insert into public.master_cvs (user_id, version, is_current, content, source_file_path)
    values (p_user_id, next_version, true, p_content, p_source_file_path)
    returning * into new_row;

  return new_row;
end;
$$;

revoke execute on function public.create_master_cv_version(uuid, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.create_master_cv_version(uuid, jsonb, text)
  to service_role;