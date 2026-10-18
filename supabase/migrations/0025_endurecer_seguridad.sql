-- 0025: endurece la seguridad de la base de datos. Aditivo: no cambia
-- tablas ni datos, solo permisos y validaciones.
--
-- 1) En Postgres toda función nace ejecutable por PUBLIC (incluye "anon", es
--    decir, cualquiera con la anon key, que es pública en el navegador).
--    Las funciones internas se dejan solo para uso interno.
-- 2) validar_acceso_qr y obtener_kpis_sede: si quien llama no tiene rol
--    (anónimo), auth_role() es NULL y "NULL not in (...)" NO lanza el error.
--    Se corrige con "is null or ..." y "is distinct from".
-- 3) Los comprobantes de pago dejan de ser visibles para cualquier cliente.
--
-- Ejecutar en Supabase > SQL Editor (o supabase db push).

-- ============================================================ 1) permisos
-- Internas: solo las usan otras funciones security definer y los triggers
-- (que corren como dueño), así que nadie de fuera necesita llamarlas.
revoke execute on function public.gt_notificar(uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.gt_notificar_profesionales(uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.gt_nombre(uuid) from public, anon, authenticated;

-- Helpers de RLS: las políticas (to authenticated) los necesitan, anon no.
revoke execute on function public.auth_role() from public, anon;
revoke execute on function public.auth_sede_id() from public, anon;
revoke execute on function public.gt_mi_rol() from public, anon;
revoke execute on function public.gt_mi_sede() from public, anon;
revoke execute on function public.gt_cliente_en_mi_sede(uuid) from public, anon;
revoke execute on function public.gt_es_mi_cliente(uuid) from public, anon;
grant execute on function public.auth_role() to authenticated;
grant execute on function public.auth_sede_id() to authenticated;
grant execute on function public.gt_mi_rol() to authenticated;
grant execute on function public.gt_mi_sede() to authenticated;
grant execute on function public.gt_cliente_en_mi_sede(uuid) to authenticated;
grant execute on function public.gt_es_mi_cliente(uuid) to authenticated;

-- RPC que usa la app: solo usuarios con sesión.
revoke execute on function public.validar_acceso_qr(text, uuid) from public, anon;
revoke execute on function public.obtener_kpis_sede(uuid) from public, anon;
revoke execute on function public.cliente_pagar_plan(uuid, text) from anon;
revoke execute on function public.staff_vender_plan(uuid, uuid, text) from anon;
grant execute on function public.validar_acceso_qr(text, uuid) to authenticated;
grant execute on function public.obtener_kpis_sede(uuid) to authenticated;

-- ============================================================ 2) validaciones
-- Mismo cuerpo que en 20250101000005 / 20250101000008; solo cambian las
-- comprobaciones de rol y sede para que un NULL nunca pase.

create or replace function validar_acceso_qr(
  p_qr_code text,
  p_sede_actual_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role   user_role;
  v_actor_sede   uuid;
  v_cliente      profiles%rowtype;
  v_membresia    membresias%rowtype;
  v_plan         planes%rowtype;
  v_ultimo_acceso timestamptz;
  v_cooldown_segundos int := 60; -- evita doble-scan accidental del mismo QR
begin
  -- 0. Solo staff autorizado puede ejecutar esta función.
  -- Como es SECURITY DEFINER, bypassea RLS, así que la validación
  -- de "quién puede llamarla" tiene que vivir aquí adentro.
  v_actor_role := auth_role();
  v_actor_sede := auth_sede_id();

  if v_actor_role is null or v_actor_role not in ('recepcionista', 'admin_sede', 'super_admin') then
    raise exception 'No autorizado para validar accesos';
  end if;

  -- Un recepcionista/admin_sede solo puede registrar accesos en SU sede,
  -- no puede mandar p_sede_actual_id de otra sede (evita suplantación).
  if v_actor_role <> 'super_admin' and p_sede_actual_id is distinct from v_actor_sede then
    raise exception 'No puedes registrar accesos fuera de tu sede';
  end if;

  -- 1. Buscar cliente por qr_code
  select * into v_cliente
  from profiles
  where qr_code = p_qr_code and role = 'cliente'
  limit 1;

  if not found then
    return jsonb_build_object(
      'autorizado', false,
      'motivo', 'QR no reconocido',
      'cliente', null,
      'plan', null
    );
  end if;

  -- 2. Buscar la membresía vigente más reciente, con LOCK de fila.
  -- El "for update" es la pieza clave para las 3 sedes: si el mismo
  -- cliente intenta entrar simultáneamente por dos lecturas casi a la vez
  -- (bug de doble-tap, o escaneo duplicado por mala señal de cámara),
  -- la segunda transacción espera a que la primera termine en vez de
  -- leer datos a medio actualizar.
  select * into v_membresia
  from membresias
  where cliente_id = v_cliente.id
    and estado = 'activa'
    and fecha_fin >= current_date
  order by fecha_fin desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object(
      'autorizado', false,
      'motivo', 'Sin membresía activa o vigente',
      'cliente', v_cliente.nombre || ' ' || v_cliente.apellido,
      'plan', null
    );
  end if;

  select * into v_plan from planes where id = v_membresia.plan_id;

  -- 3. Restricción de sede: si el plan NO es multisede,
  -- solo puede entrar por la sede donde se originó la membresía.
  if not v_plan.es_multisede and v_membresia.sede_origen_id <> p_sede_actual_id then
    return jsonb_build_object(
      'autorizado', false,
      'motivo', 'Plan no habilitado para esta sede',
      'cliente', v_cliente.nombre || ' ' || v_cliente.apellido,
      'plan', v_plan.nombre
    );
  end if;

  -- 4. Anti doble-scan: si ya entró hace menos de 60s (en cualquier sede),
  -- no registrar de nuevo. Esto previene asistencias duplicadas si
  -- recepción escanea sin querer dos veces el mismo QR.
  select max(fecha_hora) into v_ultimo_acceso
  from asistencias
  where cliente_id = v_cliente.id;

  if v_ultimo_acceso is not null
     and v_ultimo_acceso > now() - (v_cooldown_segundos || ' seconds')::interval then
    return jsonb_build_object(
      'autorizado', false,
      'motivo', 'Acceso ya registrado hace instantes',
      'cliente', v_cliente.nombre || ' ' || v_cliente.apellido,
      'plan', v_plan.nombre
    );
  end if;

  -- 5. Todo válido: registrar la asistencia
  insert into asistencias (cliente_id, sede_id, fecha_hora)
  values (v_cliente.id, p_sede_actual_id, now());

  return jsonb_build_object(
    'autorizado', true,
    'motivo', null,
    'cliente', v_cliente.nombre || ' ' || v_cliente.apellido,
    'plan', v_plan.nombre
  );
end;
$$;

create or replace function obtener_kpis_sede(p_sede_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role user_role;
  v_actor_sede uuid;
  v_clientes_activos int;
  v_checkins_hoy int;
  v_por_vencer int;
  v_ingresos_mes numeric;
begin
  v_actor_role := auth_role();
  v_actor_sede := auth_sede_id();

  if v_actor_role is null or v_actor_role not in ('admin_sede', 'super_admin') then
    raise exception 'No autorizado';
  end if;

  if v_actor_role <> 'super_admin' and p_sede_id is distinct from v_actor_sede then
    raise exception 'No puedes ver KPIs de otra sede';
  end if;

  select count(*) into v_clientes_activos
  from profiles p
  join membresias m on m.cliente_id = p.id
  where p.sede_id = p_sede_id and m.estado = 'activa' and m.fecha_fin >= current_date;

  select count(*) into v_checkins_hoy
  from asistencias
  where sede_id = p_sede_id and fecha_hora >= date_trunc('day', now());

  select count(*) into v_por_vencer
  from membresias
  where sede_origen_id = p_sede_id and estado = 'activa'
    and fecha_fin between current_date and current_date + interval '7 days';

  select coalesce(sum(monto), 0) into v_ingresos_mes
  from pagos
  where sede_id = p_sede_id and fecha >= date_trunc('month', now());

  return jsonb_build_object(
    'clientesActivos', v_clientes_activos,
    'checkinsHoy', v_checkins_hoy,
    'membresiasPorVencer', v_por_vencer,
    'ingresosMes', v_ingresos_mes
  );
end;
$$;

-- create or replace conserva los permisos, pero se repiten por claridad.
revoke execute on function public.validar_acceso_qr(text, uuid) from public, anon;
revoke execute on function public.obtener_kpis_sede(uuid) from public, anon;
grant execute on function public.validar_acceso_qr(text, uuid) to authenticated;
grant execute on function public.obtener_kpis_sede(uuid) to authenticated;

-- ============================================================ 3) comprobantes
-- Antes: cualquier usuario autenticado (incluidos clientes) veía todos.
-- Ahora: solo el staff. El bucket además debe ser privado, porque en un
-- bucket público la URL directa ignora estas políticas.
drop policy if exists "comprobantes_select_autenticados" on storage.objects;
drop policy if exists "comprobantes_select_staff" on storage.objects;
create policy "comprobantes_select_staff"
on storage.objects for select to authenticated
using (
  bucket_id = 'comprobantes'
  and public.auth_role() in ('recepcionista', 'admin_sede', 'super_admin')
);

update storage.buckets set public = false where id = 'comprobantes';
