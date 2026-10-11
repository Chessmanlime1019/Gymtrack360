-- 0016: el cliente puede pagar (simulado) su membresía desde la app.
-- Todo ocurre en una función del servidor: el cliente NO inserta directo en
-- membresias/pagos, así no puede ponerse un precio, un plan o fechas a su gusto.

-- El cliente necesita poder ver los planes activos de su sede.
drop policy if exists gt_planes_select_activos on public.planes;
create policy gt_planes_select_activos on public.planes
  for select to authenticated
  using (activo = true);

create or replace function public.cliente_pagar_plan(p_plan_id uuid, p_metodo text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_rol text;
  v_sede uuid;
  v_plan record;
  v_ant record;
  v_inicio date;
  v_fin date;
  v_memb_id uuid;
  v_pago_id uuid;
  v_fecha timestamptz;
begin
  if v_user is null then
    raise exception 'Sin sesión activa';
  end if;

  select role::text, sede_id into v_rol, v_sede from public.profiles where id = v_user;
  if v_rol is distinct from 'cliente' then
    raise exception 'Solo los clientes pueden pagar desde la app';
  end if;
  if v_sede is null then
    raise exception 'Tu usuario no tiene una sede asignada';
  end if;

  if p_metodo not in ('Efectivo', 'Yape', 'Plin') then
    raise exception 'Método de pago no permitido';
  end if;

  select id, precio, duracion_dias, sede_id into v_plan
  from public.planes
  where id = p_plan_id and activo = true and (sede_id is null or sede_id = v_sede);
  if not found then
    raise exception 'Plan no disponible en tu sede';
  end if;

  -- Si ya tiene una membresía vigente, el nuevo plan empieza cuando termina esa.
  select id, fecha_fin into v_ant
  from public.membresias
  where cliente_id = v_user and estado = 'activa' and fecha_fin >= current_date
  order by fecha_fin desc
  limit 1;

  v_inicio := greatest(current_date, coalesce(v_ant.fecha_fin, current_date));
  v_fin := v_inicio + v_plan.duracion_dias;

  insert into public.membresias (cliente_id, plan_id, sede_origen_id, fecha_inicio, fecha_fin, estado)
  values (v_user, p_plan_id, v_sede, v_inicio, v_fin, 'activa')
  returning id into v_memb_id;

  insert into public.pagos (cliente_id, membresia_id, sede_id, monto, metodo_pago)
  values (v_user, v_memb_id, v_sede, v_plan.precio, p_metodo)
  returning id, fecha into v_pago_id, v_fecha;

  return jsonb_build_object(
    'pago_id', v_pago_id,
    'membresia_id', v_memb_id,
    'monto', v_plan.precio,
    'fecha', v_fecha,
    'fecha_inicio', v_inicio,
    'fecha_fin', v_fin
  );
end;
$$;

revoke all on function public.cliente_pagar_plan(uuid, text) from public;
grant execute on function public.cliente_pagar_plan(uuid, text) to authenticated;