-- ============================================
-- GYMTRACK 360 - RPC de validación de acceso QR
-- ============================================

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

  if v_actor_role not in ('recepcionista', 'admin_sede', 'super_admin') then
    raise exception 'No autorizado para validar accesos';
  end if;

  -- Un recepcionista/admin_sede solo puede registrar accesos en SU sede,
  -- no puede mandar p_sede_actual_id de otra sede (evita suplantación).
  if v_actor_role <> 'super_admin' and p_sede_actual_id <> v_actor_sede then
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

-- Solo usuarios autenticados pueden invocarla (la función misma
-- filtra por rol internamente en el paso 0)
grant execute on function validar_acceso_qr(text, uuid) to authenticated;