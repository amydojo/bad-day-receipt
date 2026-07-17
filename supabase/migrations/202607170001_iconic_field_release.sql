alter table public.field_objects
  add column if not exists archive_view_count bigint not null default 0;

drop function if exists public.record_field_event(text,text,text,text,text,text,text,uuid,jsonb);

create function public.record_field_event(
  p_token text,
  p_event_name text,
  p_session_key text default null,
  p_visitor_key text default null,
  p_machine_code text default 'LD-001',
  p_placement_code text default null,
  p_source text default 'field-object',
  p_client_event_id uuid default gen_random_uuid(),
  p_metadata jsonb default '{}'::jsonb
)
returns table(
  accepted boolean,
  field_object_id uuid,
  edition text,
  object_name text,
  machine_code text,
  event_name text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  open_count bigint,
  verified_count bigint,
  operation_count bigint,
  receipt_count bigint,
  instagram_click_count bigint,
  archive_view_count bigint
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_object public.field_objects%rowtype;
  v_machine public.field_machines%rowtype;
  v_session_id uuid;
  v_placement_id uuid;
  v_event_name text := lower(trim(p_event_name));
  v_session_hash text;
  v_visitor_hash text;
  v_rows integer := 0;
begin
  if v_event_name not in (
    'field_opened',
    'object_presented',
    'qr_verified',
    'machine_started',
    'receipt_generated',
    'field_archive_viewed',
    'instagram_clicked'
  ) then
    raise exception 'Unsupported FIELD event: %', v_event_name using errcode = '22023';
  end if;

  select fo.* into v_object
  from public.field_objects fo
  where fo.token_hash = encode(extensions.digest(upper(trim(p_token)), 'sha256'), 'hex')
  limit 1;

  if v_object.id is null then
    raise exception 'Unknown FIELD object' using errcode = 'P0002';
  end if;
  if v_object.status <> 'active' then
    raise exception 'FIELD object is %', v_object.status using errcode = '55000';
  end if;

  select fm.* into v_machine
  from public.field_machines fm
  where fm.machine_code = upper(trim(p_machine_code))
    and fm.status = 'active'
  limit 1;
  if v_machine.id is null then
    raise exception 'Unknown or inactive Lab Dojo machine' using errcode = 'P0002';
  end if;

  if nullif(trim(p_session_key), '') is not null then
    v_session_hash := encode(extensions.digest(trim(p_session_key), 'sha256'), 'hex');
    if nullif(trim(p_visitor_key), '') is not null then
      v_visitor_hash := encode(extensions.digest(trim(p_visitor_key), 'sha256'), 'hex');
    end if;
    insert into public.field_sessions (session_hash, visitor_hash, first_object_id, last_object_id, event_count)
    values (v_session_hash, v_visitor_hash, v_object.id, v_object.id, 0)
    on conflict (session_hash) do update
      set visitor_hash = coalesce(public.field_sessions.visitor_hash, excluded.visitor_hash),
          last_seen_at = now(),
          last_object_id = excluded.last_object_id
    returning id into v_session_id;
  end if;

  if nullif(trim(p_placement_code), '') is not null then
    select fp.id into v_placement_id
    from public.field_placements fp
    where fp.placement_code = trim(p_placement_code)
      and fp.field_object_id = v_object.id
      and fp.active_from <= now()
      and (fp.active_until is null or fp.active_until > now())
    limit 1;
  end if;

  insert into public.field_events (
    client_event_id, field_object_id, machine_id, session_id, placement_id,
    event_name, source, event_metadata
  ) values (
    p_client_event_id, v_object.id, v_machine.id, v_session_id, v_placement_id,
    v_event_name, coalesce(nullif(left(trim(p_source), 80), ''), 'field-object'),
    jsonb_strip_nulls(jsonb_build_object(
      'returning', p_metadata -> 'returning',
      'client_version', p_metadata -> 'client_version',
      'viewport_class', p_metadata -> 'viewport_class'
    ))
  )
  on conflict (client_event_id) do nothing;

  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    update public.field_objects fo
    set first_seen_at = coalesce(fo.first_seen_at, now()),
        last_seen_at = now(),
        open_count = fo.open_count + case when v_event_name = 'field_opened' then 1 else 0 end,
        presented_count = fo.presented_count + case when v_event_name = 'object_presented' then 1 else 0 end,
        verified_count = fo.verified_count + case when v_event_name = 'qr_verified' then 1 else 0 end,
        operation_count = fo.operation_count + case when v_event_name = 'machine_started' then 1 else 0 end,
        receipt_count = fo.receipt_count + case when v_event_name = 'receipt_generated' then 1 else 0 end,
        archive_view_count = fo.archive_view_count + case when v_event_name = 'field_archive_viewed' then 1 else 0 end,
        instagram_click_count = fo.instagram_click_count + case when v_event_name = 'instagram_clicked' then 1 else 0 end
    where fo.id = v_object.id;

    if v_session_id is not null then
      update public.field_sessions fs
      set last_seen_at = now(), last_object_id = v_object.id, event_count = fs.event_count + 1
      where fs.id = v_session_id;
    end if;

    if v_placement_id is not null then
      update public.field_placements fp
      set first_seen_at = coalesce(fp.first_seen_at, now()),
          last_seen_at = now(),
          open_count = fp.open_count + case when v_event_name = 'field_opened' then 1 else 0 end,
          instagram_click_count = fp.instagram_click_count + case when v_event_name = 'instagram_clicked' then 1 else 0 end
      where fp.id = v_placement_id;
    end if;

    if v_event_name = 'machine_started' then
      insert into public.field_unlocks (field_object_id, machine_id, operation_count)
      values (v_object.id, v_machine.id, 1)
      on conflict (field_object_id, machine_id) do update
        set last_operated_at = now(),
            operation_count = public.field_unlocks.operation_count + 1;
    end if;
  end if;

  return query
  select true, fo.id, fo.edition, fo.object_name, fm.machine_code, v_event_name,
         fo.first_seen_at, fo.last_seen_at, fo.open_count, fo.verified_count,
         fo.operation_count, fo.receipt_count, fo.instagram_click_count, fo.archive_view_count
  from public.field_objects fo
  join public.field_machines fm on fm.id = fo.default_machine_id
  where fo.id = v_object.id;
end;
$$;

create or replace function public.get_field_metrics(p_since timestamptz)
returns jsonb
language sql
security definer
set search_path = public
as $$
with event_window as (
  select e.*, o.edition, o.object_name, o.object_type,
         coalesce(s.visitor_hash, s.session_hash) as anonymous_person
  from public.field_events e
  join public.field_objects o on o.id = e.field_object_id
  left join public.field_sessions s on s.id = e.session_id
  where e.occurred_at >= p_since
),
funnel as (
  select event_name, count(*)::bigint as event_count
  from event_window
  group by event_name
),
visitor_totals as (
  select count(distinct anonymous_person)::bigint as visitors
  from event_window
  where event_name = 'field_opened'
),
card_rows as (
  select o.edition, o.object_name as name, o.object_type, o.first_seen_at, o.last_seen_at,
         count(*) filter (where e.event_name = 'field_opened')::bigint as pageviews,
         count(distinct e.anonymous_person) filter (where e.event_name = 'field_opened')::bigint as visitors,
         count(*) filter (where e.event_name = 'field_opened')::bigint as field_opened,
         count(*) filter (where e.event_name = 'object_presented')::bigint as object_presented,
         count(*) filter (where e.event_name = 'qr_verified')::bigint as qr_verified,
         count(*) filter (where e.event_name = 'machine_started')::bigint as machine_started,
         count(*) filter (where e.event_name = 'receipt_generated')::bigint as receipt_generated,
         count(*) filter (where e.event_name = 'field_archive_viewed')::bigint as field_archive_viewed,
         count(*) filter (where e.event_name = 'instagram_clicked')::bigint as instagram_clicked,
         p.placement_code, p.label as placement_label
  from public.field_objects o
  left join event_window e on e.field_object_id = o.id
  left join lateral (
    select fp.placement_code, fp.label
    from public.field_placements fp
    where fp.field_object_id = o.id
      and fp.active_from <= now()
      and (fp.active_until is null or fp.active_until > now())
    order by fp.active_from desc limit 1
  ) p on true
  where o.batch_code = 'FIELD-001'
  group by o.id, o.edition, o.object_name, o.object_type,
           o.first_seen_at, o.last_seen_at, p.placement_code, p.label
  order by o.edition
),
machine_row as (
  select jsonb_build_object(
    'machine_code', m.machine_code,
    'machine_name', m.canonical_name,
    'object_unlock_count', count(u.id)::bigint,
    'total_operations', coalesce(sum(u.operation_count), 0)::bigint,
    'first_unlocked_at', min(u.first_unlocked_at),
    'last_operated_at', max(u.last_operated_at)
  ) as payload
  from public.field_machines m
  left join public.field_unlocks u on u.machine_id = m.id
  where m.machine_code = 'LD-001'
  group by m.id, m.machine_code, m.canonical_name
)
select jsonb_build_object(
  'generatedAt', now(), 'since', p_since,
  'machine', coalesce((select payload from machine_row), '{}'::jsonb),
  'totals', jsonb_build_object(
    'pageviews', coalesce((select event_count from funnel where event_name = 'field_opened'), 0),
    'visitors', coalesce((select visitors from visitor_totals), 0),
    'field_opened', coalesce((select event_count from funnel where event_name = 'field_opened'), 0),
    'object_presented', coalesce((select event_count from funnel where event_name = 'object_presented'), 0),
    'qr_verified', coalesce((select event_count from funnel where event_name = 'qr_verified'), 0),
    'machine_started', coalesce((select event_count from funnel where event_name = 'machine_started'), 0),
    'receipt_generated', coalesce((select event_count from funnel where event_name = 'receipt_generated'), 0),
    'field_archive_viewed', coalesce((select event_count from funnel where event_name = 'field_archive_viewed'), 0),
    'instagram_clicked', coalesce((select event_count from funnel where event_name = 'instagram_clicked'), 0)
  ),
  'cards', coalesce((select jsonb_agg(to_jsonb(card_rows)) from card_rows), '[]'::jsonb)
);
$$;

create or replace function public.get_field_release()
returns jsonb
language sql
security definer
set search_path = public
as $$
with cards as (
  select o.edition, o.object_name, o.object_type,
         case when o.first_seen_at is null then 'signal-absent' else 'recovered' end as status,
         o.first_seen_at as recovered_at, o.last_seen_at, o.operation_count,
         'SOUTHERN CALIFORNIA'::text as region
  from public.field_objects o
  where o.batch_code = 'FIELD-001'
  order by o.edition
)
select jsonb_build_object(
  'releaseCode', 'FIELD-001', 'releaseLabel', 'FIELD–001',
  'machineCode', 'LD-001', 'machineLabel', 'LD–001',
  'machineName', 'Bad Day Receipt', 'region', 'SOUTHERN CALIFORNIA',
  'total', (select count(*) from cards),
  'recoveredCount', (select count(*) from cards where status = 'recovered'),
  'generatedAt', now(),
  'cards', coalesce((select jsonb_agg(to_jsonb(cards)) from cards), '[]'::jsonb)
);
$$;

revoke all on function public.record_field_event(text,text,text,text,text,text,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.record_field_event(text,text,text,text,text,text,text,uuid,jsonb) to service_role;
revoke all on function public.get_field_metrics(timestamptz) from public, anon, authenticated;
grant execute on function public.get_field_metrics(timestamptz) to service_role;
revoke all on function public.get_field_release() from public, anon, authenticated;
grant execute on function public.get_field_release() to service_role;
