-- 0026: el pago del cliente desde la app deja de activar la membresía al
-- instante. Ahora funciona como en un gimnasio real:
--
--   1. El cliente elige plan y método (y, si es Yape/Plin, el N.° de operación)
--      -> se crea una SOLICITUD pendiente y recepción recibe una notificación.
--   2. Recepción revisa (que el Yape llegó / que pagó en caja) y aprueba o rechaza.
--   3. Al aprobar se crean la membresía y el pago con staff_vender_plan (la misma
--      lógica de siempre), así que caja, KPIs y control de acceso solo cuentan
--      pagos confirmados. Al rechazar, el cliente recibe el motivo.
--
-- Requiere 0021 (staff_vender_plan) y 0019 (notificaciones). Aditivo.

-- ------------------------------------------------------------------ tabla
create table if not exists public.solicitudes_pago (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.planes(id),
  sede_id uuid not null references public.sedes(id),
  monto numeric(10,2) not null,
  metodo_pago text not null check (metodo_pago in ('Efectivo', 'Yape', 'Plin')),
  numero_operacion text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobada', 'rechazada', 'cancelada')),
  motivo_rechazo text,
  revisado_por uuid references public.profiles(id),
  revisado_at timestamptz,
  membresia_id uuid references public.membresias(id),
  pago_id uuid references public.pagos(id),
  created_at timestamptz not null default now(),
  -- Yape/Plin llevan N.° de operación; efectivo no.
  constraint solicitudes_pago_operacion_chk check (
    (metodo_pago = 'Efectivo' and numero_operacion is null)
    or (metodo_pago in ('Yape', 'Plin') and numero_operacion ~ '^[0-9]{6,10}$')
  )
);

create index if not exists solicitudes_pago_sede_estado_idx
  on public.solicitudes_pago (sede_id, estado, created_at desc);
create index if not exists solicitudes_pago_cliente_idx
  on public.solicitudes_pago (cliente_id, created_at desc);

-- Una sola solicitud pendiente por cliente.
create unique index if not exists solicitudes_pago_una_pendiente
  on public.solicitudes_pago (cliente_id) where estado = 'pendiente';

-- El mismo N.° de operación no se puede usar dos veces (salvo que se rechazara).
create unique index if not exists solicitudes_pago_operacion_unica
  on public.solicitudes_pago (metodo_pago, numero_operacion)
  where numero_operacion is not null and estado in ('pendiente', 'aprobada');

-- ------------------------------------------------------------------ RLS
alter table public.solicitudes_pago enable row level security;

drop policy if exists gt_solicitudes_select_propias on public.solicitudes_pago;
create policy gt_solicitudes_select_propias on public.solicitudes_pago
  for select to authenticated
  using (cliente_id = auth.uid());

drop policy if exists gt_solicitudes_select_staff on public.solicitudes_pago;
create policy gt_solicitudes_select_staff on public.solicitudes_pago
  for select to authenticated
  using (
    public.gt_mi_rol() = 'super_admin'
    or (public.gt_mi_rol() in ('recepcionista', 'admin_sede') and sede_id = public.gt_mi_sede())
  );

-- Nadie escribe directo: todo pasa por las funciones de abajo.
revoke insert, update, delete on public.solicitudes_pago from anon, authenticated;

-- Auditoría (misma función que el resto de tablas, ver 0013).
drop trigger if exists trg_historial_solicitudes_pago on public.solicitudes_pago;
create trigger trg_historial_solicitudes_pago
  after insert or update on public.solicitudes_pago
  for each row execute function public.fn_registrar_operacion();

-- ------------------------------------------------------------------ cliente: solicitar
create or replace function public.cliente_solicitar_pago(
  p_plan_id uuid,
  p_metodo text,
  p_operacion text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_rol text;
  v_sede uuid;
  v_plan record;
  v_op text := nullif(btrim(coalesce(p_operacion, '')), '');
  v_id uuid;
  v_fecha timestamptz;
  v_cliente text;
  r record;
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

  if p_metodo is null or p_metodo not in ('Efectivo', 'Yape', 'Plin') then
    raise exception 'Método de pago no permitido';
  end if;
  if p_metodo = 'Efectivo' then
    v_op := null;
  elsif v_op is null or v_op !~ '^[0-9]{6,10}$' then
    raise exception 'Ingresa el N.° de operación (6 a 10 dígitos)';
  end if;

  select id, nombre, precio into v_plan
  from public.planes
  where id = p_plan_id and activo = true and (sede_id is null or sede_id = v_sede);
  if not found then
    raise exception 'Plan no disponible en tu sede';
  end if;

  if exists (select 1 from public.solicitudes_pago where cliente_id = v_user and estado = 'pendiente') then
    raise exception 'Ya tienes un pago pendiente de confirmar. Espera a recepción o cancélalo.';
  end if;
  if v_op is not null and exists (
    select 1 from public.solicitudes_pago
    where metodo_pago = p_metodo and numero_operacion = v_op and estado in ('pendiente', 'aprobada')
  ) then
    raise exception 'Ese N.° de operación ya fue registrado';
  end if;

  insert into public.solicitudes_pago (cliente_id, plan_id, sede_id, monto, metodo_pago, numero_operacion)
  values (v_user, v_plan.id, v_sede, v_plan.precio, p_metodo, v_op)
  returning id, created_at into v_id, v_fecha;

  -- Aviso a recepción y admin de la sede.
  v_cliente := coalesce(public.gt_nombre(v_user), 'Un cliente');
  for r in
    select id from public.profiles
    where sede_id = v_sede and role::text in ('recepcionista', 'admin_sede') and activo is not false
  loop
    perform public.gt_notificar(r.id, 'warning', 'Pago por confirmar',
      v_cliente || ' pagó ' || v_plan.nombre || ' (S/ ' || to_char(v_plan.precio, 'FM999990.00') || ') con ' ||
      p_metodo || case when v_op is not null then ' · Op. ' || v_op else ' en caja' end || '.',
      '/recepcion/pagos-por-confirmar');
  end loop;

  return jsonb_build_object('id', v_id, 'monto', v_plan.precio, 'fecha', v_fecha);
end;
$$;

-- ------------------------------------------------------------------ cliente: cancelar
create or replace function public.cliente_cancelar_solicitud(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.solicitudes_pago
     set estado = 'cancelada', revisado_at = now()
   where id = p_id and cliente_id = auth.uid() and estado = 'pendiente';
  if not found then
    raise exception 'La solicitud ya no está pendiente';
  end if;
end;
$$;

-- ------------------------------------------------------------------ staff: aprobar / rechazar
create or replace function public.staff_revisar_solicitud(
  p_id uuid,
  p_aprobar boolean,
  p_motivo text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_rol text;
  v_sede uuid;
  v_sol record;
  v_precio numeric;
  v_venta jsonb;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if v_user is null then
    raise exception 'Sin sesión activa';
  end if;

  select role::text, sede_id into v_rol, v_sede from public.profiles where id = v_user;
  if v_rol is null or v_rol not in ('recepcionista', 'admin_sede', 'super_admin') then
    raise exception 'No tienes permiso para confirmar pagos';
  end if;

  -- Bloquea la fila: si dos recepcionistas pulsan a la vez, solo uno gana.
  select * into v_sol from public.solicitudes_pago where id = p_id for update;
  if not found then
    raise exception 'Solicitud no encontrada';
  end if;
  if v_rol <> 'super_admin' and v_sol.sede_id is distinct from v_sede then
    raise exception 'Esa solicitud pertenece a otra sede';
  end if;
  if v_sol.estado <> 'pendiente' then
    raise exception 'Esta solicitud ya fue revisada';
  end if;

  if not coalesce(p_aprobar, false) then
    if v_motivo is null or length(v_motivo) < 3 then
      raise exception 'Escribe el motivo del rechazo';
    end if;
    update public.solicitudes_pago
       set estado = 'rechazada', motivo_rechazo = v_motivo, revisado_por = v_user, revisado_at = now()
     where id = p_id;
    perform public.gt_notificar(v_sol.cliente_id, 'danger', 'Pago no confirmado',
      'Recepción no pudo confirmar tu pago de S/ ' || to_char(v_sol.monto, 'FM999990.00') || ': ' || v_motivo,
      '/cliente/pagar');
    return jsonb_build_object('estado', 'rechazada');
  end if;

  -- Si el plan cambió de precio desde que el cliente pagó, no se aprueba a ciegas.
  select precio into v_precio from public.planes where id = v_sol.plan_id;
  if v_precio is distinct from v_sol.monto then
    raise exception 'El precio del plan cambió desde que el cliente pagó. Rechaza la solicitud y pídele que la envíe de nuevo.';
  end if;

  -- Misma lógica que una venta en recepción (fechas, sede, notificaciones).
  v_venta := public.staff_vender_plan(v_sol.cliente_id, v_sol.plan_id, v_sol.metodo_pago);

  update public.solicitudes_pago
     set estado = 'aprobada',
         revisado_por = v_user,
         revisado_at = now(),
         membresia_id = (v_venta->>'membresia_id')::uuid,
         pago_id = (v_venta->>'pago_id')::uuid
   where id = p_id;

  return v_venta || jsonb_build_object('estado', 'aprobada');
end;
$$;

-- ------------------------------------------------------------------ permisos
revoke all on function public.cliente_solicitar_pago(uuid, text, text) from public, anon;
revoke all on function public.cliente_cancelar_solicitud(uuid) from public, anon;
revoke all on function public.staff_revisar_solicitud(uuid, boolean, text) from public, anon;
grant execute on function public.cliente_solicitar_pago(uuid, text, text) to authenticated;
grant execute on function public.cliente_cancelar_solicitud(uuid) to authenticated;
grant execute on function public.staff_revisar_solicitud(uuid, boolean, text) to authenticated;

-- El pago instantáneo (0016) queda desactivado: ya no se puede activar una
-- membresía sin que recepción confirme el pago.
revoke execute on function public.cliente_pagar_plan(uuid, text) from public, anon, authenticated;
