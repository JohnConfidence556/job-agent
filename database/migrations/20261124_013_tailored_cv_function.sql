create function public.create_tailored_cv_version(
  p_user_id uuid,
  p_match_id uuid,
  p_master_cv_id uuid,
  p_content jsonb,
  p_report jsonb,
  p_model text,
  p_prompt_version text
)
returns public.tailored_cvs
language plpgsql
set search_path = ''
as $$
declare
  next_version integer;
  new_row public.tailored_cvs;
begin
  perform 1
    from public.matches
    where id = p_match_id and user_id = p_user_id
    for update;
  if not found then
    raise exception 'match % does not belong to user %', p_match_id, p_user_id;
  end if;

  select coalesce(max(version), 0) + 1
    into next_version
    from public.tailored_cvs
    where match_id = p_match_id;

  update public.tailored_cvs
    set is_current = false
    where match_id = p_match_id and is_current;

  insert into public.tailored_cvs (
    user_id, match_id, master_cv_id, version, is_current, content,
    validation_status, validation_report, model, prompt_version
  )
  values (
    p_user_id, p_match_id, p_master_cv_id, next_version, true, p_content,
    'passed', p_report, p_model, p_prompt_version
  )
  returning * into new_row;

  return new_row;
end;
$$;

revoke execute on function public.create_tailored_cv_version(uuid, uuid, uuid, jsonb, jsonb, text, text)
  from public, anon, authenticated;
grant execute on function public.create_tailored_cv_version(uuid, uuid, uuid, jsonb, jsonb, text, text)
  to service_role;