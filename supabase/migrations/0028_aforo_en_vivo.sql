-- 0028: aforo en vivo: cuántas personas hay dentro de cada sede ahora mismo.
--
-- · El mismo escaneo sirve en los dos sentidos: si el cliente no está dentro
--   registra su entrada; si ya está dentro, su salida.
-- · "Dentro" = entró, no tiene salida y entró hace menos de 3 horas. Mucha gente
--   no escanea al salir: sin ese límite el aforo solo subiría.
-- · Recepción también puede marcar una salida a mano.
-- · El aforo máximo es por sede y opcional. Superarlo avisa, no bloquea.

alter table public.sedes
  add column if not exists aforo_maximo integer check (aforo_maximo is null or aforo_maximo > 0);

alter table public.asistencias
  add column if not exists salida_at timestamptz;

create index if not exists asistencias_abiertas_idx
  on public.asistencias (sede_id, fecha_hora desc) where salida_at is null;
create index if not exists asistencias_cliente_fecha_idx
  on public.asistencias (cliente_id, fecha_hora desc);

-- Tiempo tras el cual una entrada sin salida deja de contar como "dentro".
create or replace function public.gt_estadia_maxima() returns interval
language sql immutable as $$ select interval '3 hours' $$;

create or replace function public.gt_personas_dentro(p_sede uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.asistencias
  where sede_id = p_sede and salida_at is null and fecha_hora > now() - public.gt_estadia_maxima()
$$;

-- ------------------------------------------------------------ escaneo
-- Mismo contrato que antes; se añaden tipo ('entrada'|'salida'), dentro,
-- aforo_maximo y minutos. Las validaciones de rol y membresía no cambian.
create or replace function public.validar_acceso_qr(
  p_qr_code text,
  p_sede_actual_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role    user_role;
  v_actor_sede    uuid;
  v_cliente       profiles%rowtype;
  v_membresia     membresias%rowtype;
  v_plan          planes%rowtype;
  v_abierta       asistencias%rowtype;
  v_ultimo        timestamptz;
  v_maximo        integer;
  v_cooldown_segundos int := 60; -- evita doble-scan accidental del mismo QR
begin
  v_actor_role := auth_role();
  v_actor_sede := auth_sede_id();

  if v_actor_role is null or v_actor_role not in ('recepcionista', 'admin_sede', 'super_admin') then
    raise exception 'No autorizado para validar accesos';
  end if;

  if v_actor_role <> 'super_admin' and p_sede_actual_id is distinct from v_actor_sede then
    raise exception 'No puedes registrar accesos fuera de tu sede';
  end if;

  select * into v_cliente
  from profiles
  where qr_code = p_qr_code and role = 'cliente'
  limit 1;

  if not found then
    return jsonb_build_object('autorizado', false, 'tipo', 'entrada', 'motivo', 'QR no reconocido', 'cliente', null, 'plan', null);
  end if;

  -- Dos lecturas casi simultáneas del mismo QR: la segunda espera a la primera.
  perform pg_advisory_xact_lock(hashtextextended(v_cliente.id::text, 0));

  select aforo_maximo into v_maximo from sedes where id = p_sede_actual_id;

  -- Anti doble-scan: cubre también la salida, para que un doble toque
  -- no saque a la persona y la vuelva a entrar.
  select greatest(max(fecha_hora), max(salida_at)) into v_ultimo
  from asistencias
  where cliente_id = v_cliente.id;

  if v_ultimo is not null
     and v_ultimo > now() - (v_cooldown_segundos || ' seconds')::interval then
    return jsonb_build_object(
      'autorizado', false,
      'tipo', 'entrada',
      'motivo', 'Registro hecho hace instantes. Espera un minuto.',
      'cliente', v_cliente.nombre || ' ' || v_cliente.apellido,
      'plan', null
    );
  end if;

  select * into v_abierta
  from asistencias
  where cliente_id = v_cliente.id
    and salida_at is null
    and fecha_hora > now() - gt_estadia_maxima()
  order by fecha_hora desc
  limit 1;

  if found then
    update asistencias set salida_at = now() where id = v_abierta.id;

    -- Ya estaba dentro de esta sede: es su salida. La membresía no importa:
    -- alguien cuyo plan venció mientras entrenaba también tiene que poder salir.
    if v_abierta.sede_id = p_sede_actual_id then
      return jsonb_build_object(
        'autorizado', true,
        'tipo', 'salida',
        'motivo', null,
        'cliente', v_cliente.nombre || ' ' || v_cliente.apellido,
        'plan', null,
        'minutos', round(extract(epoch from now() - v_abierta.fecha_hora) / 60),
        'dentro', gt_personas_dentro(p_sede_actual_id),
        'aforo_maximo', v_maximo
      );
    end if;
    -- Figuraba en otra sede: se cierra esa visita y sigue como entrada aquí.
  end if;

  select * into v_membresia
  from membresias
  where cliente_id = v_cliente.id
    and estado = 'activa'
    and fecha_fin >= (now() at time zone 'America/Lima')::date
  order by fecha_fin desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object(
      'autorizado', false,
      'tipo', 'entrada',
      'motivo', 'Sin membresía activa o vigente',
      'cliente', v_cliente.nombre || ' ' || v_cliente.apellido,
      'plan', null
    );
  end if;

  select * into v_plan from planes where id = v_membresia.plan_id;

  if not v_plan.es_multisede and v_membresia.sede_origen_id <> p_sede_actual_id then
    return jsonb_build_object(
      'autorizado', false,
      'tipo', 'entrada',
      'motivo', 'Plan no habilitado para esta sede',
      'cliente', v_cliente.nombre || ' ' || v_cliente.apellido,
      'plan', v_plan.nombre
    );
  end if;

  insert into asistencias (cliente_id, sede_id, fecha_hora)
  values (v_cliente.id, p_sede_actual_id, now());

  return jsonb_build_object(
    'autorizado', true,
    'tipo', 'entrada',
    'motivo', null,
    'cliente', v_cliente.nombre || ' ' || v_cliente.apellido,
    'plan', v_plan.nombre,
    'dentro', gt_personas_dentro(p_sede_actual_id),
    'aforo_maximo', v_maximo
  );
end;
$$;

-- ------------------------------------------------------------ consultas
-- Cifras por sede, sin datos personales: también las ve el cliente, para saber
-- si el local está lleno antes de ir.
create or replace function public.aforo_sedes()
returns table (sede_id uuid, nombre text, dentro integer, aforo_maximo integer)
language sql stable security definer set search_path = public as $$
  select s.id, s.nombre, public.gt_personas_dentro(s.id), s.aforo_maximo
  from public.sedes s
  where s.activa and auth.uid() is not null
  order by s.nombre
$$;

-- Lista con nombres: solo el staff de esa sede.
create or replace function public.personas_dentro(p_sede uuid)
returns table (asistencia_id uuid, cliente_id uuid, cliente text, avatar_url text, fecha_hora timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  v_rol user_role := auth_role();
begin
  if v_rol is null or v_rol not in ('recepcionista', 'admin_sede', 'super_admin') then
    raise exception 'No autorizado';
  end if;
  if v_rol <> 'super_admin' and p_sede is distinct from auth_sede_id() then
    raise exception 'Esa sede no es la tuya';
  end if;

  return query
    select a.id, a.cliente_id, trim(p.nombre || ' ' || p.apellido), p.avatar_url, a.fecha_hora
    from asistencias a
    join profiles p on p.id = a.cliente_id
    where a.sede_id = p_sede and a.salida_at is null and a.fecha_hora > now() - gt_estadia_maxima()
    order by a.fecha_hora desc;
end;
$$;

-- Salida marcada a mano por recepción.
create or replace function public.registrar_salida(p_asistencia uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_rol user_role := auth_role();
  v_sede uuid;
begin
  if v_rol is null or v_rol not in ('recepcionista', 'admin_sede', 'super_admin') then
    raise exception 'No autorizado';
  end if;

  select sede_id into v_sede from asistencias where id = p_asistencia;
  if not found then
    raise exception 'Asistencia no encontrada';
  end if;
  if v_rol <> 'super_admin' and v_sede is distinct from auth_sede_id() then
    raise exception 'Esa sede no es la tuya';
  end if;

  update asistencias set salida_at = now() where id = p_asistencia and salida_at is null;
  if not found then
    raise exception 'Esa persona ya registró su salida';
  end if;
end;
$$;

-- ------------------------------------------------------------ permisos
revoke all on function public.gt_personas_dentro(uuid) from public, anon, authenticated;
revoke all on function public.validar_acceso_qr(text, uuid) from public, anon;
revoke all on function public.aforo_sedes() from public, anon;
revoke all on function public.personas_dentro(uuid) from public, anon;
revoke all on function public.registrar_salida(uuid) from public, anon;
grant execute on function public.validar_acceso_qr(text, uuid) to authenticated;
grant execute on function public.aforo_sedes() to authenticated;
grant execute on function public.personas_dentro(uuid) to authenticated;
grant execute on function public.registrar_salida(uuid) to authenticated;

-- ------------------------------------------------------------ tiempo real
-- Sin esto la tabla no emite eventos y los paneles no se actualizan solos.
do $$
begin
  alter publication supabase_realtime add table public.asistencias;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
