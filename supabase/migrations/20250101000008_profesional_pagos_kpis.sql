-- ============================================
-- GYMTRACK 360 - Módulo Profesional, mejora de Pagos, KPIs de Dashboard
-- ============================================

-- ---------- PROFESIONAL_CLIENTES (tabla intermedia) ----------
create table profesional_clientes (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profiles(id) on delete cascade,
  cliente_id uuid not null references profiles(id) on delete cascade,
  sede_id uuid not null references sedes(id),
  created_at timestamptz not null default now(),
  unique (profesional_id, cliente_id)
);

create index idx_profesional_clientes_profesional on profesional_clientes(profesional_id);
create index idx_profesional_clientes_cliente on profesional_clientes(cliente_id);

alter table profesional_clientes enable row level security;

create policy "profesional_clientes_select_propio"
on profesional_clientes for select to authenticated
using (profesional_id = auth.uid() or cliente_id = auth.uid());

create policy "profesional_clientes_select_staff_su_sede"
on profesional_clientes for select to authenticated
using (auth_role() in ('admin_sede', 'super_admin')
  and (auth_role() = 'super_admin' or sede_id = auth_sede_id()));

create policy "profesional_clientes_insert_staff"
on profesional_clientes for insert to authenticated
with check (auth_role() in ('admin_sede', 'super_admin')
  and (auth_role() = 'super_admin' or sede_id = auth_sede_id()));

create policy "profesional_clientes_delete_staff"
on profesional_clientes for delete to authenticated
using (auth_role() in ('admin_sede', 'super_admin')
  and (auth_role() = 'super_admin' or sede_id = auth_sede_id()));

-- ---------- EJERCICIOS (catálogo compartido) ----------
create table ejercicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  grupo_muscular text,
  created_at timestamptz not null default now()
);

alter table ejercicios enable row level security;

create policy "ejercicios_select_autenticados"
on ejercicios for select to authenticated using (true);

create policy "ejercicios_insert_profesional_staff"
on ejercicios for insert to authenticated
with check (auth_role() in ('profesional', 'admin_sede', 'super_admin'));

-- ---------- RUTINAS ----------
create table rutinas (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid not null references profiles(id),
  cliente_id uuid not null references profiles(id),
  nombre text not null,
  descripcion text,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_rutinas_cliente on rutinas(cliente_id);
create index idx_rutinas_profesional on rutinas(profesional_id);

create trigger trg_rutinas_updated_at before update on rutinas
  for each row execute function set_updated_at();

alter table rutinas enable row level security;

create policy "rutinas_select_profesional_propio"
on rutinas for select to authenticated
using (profesional_id = auth.uid());

create policy "rutinas_select_cliente_propio"
on rutinas for select to authenticated
using (cliente_id = auth.uid());

create policy "rutinas_select_staff_su_sede"
on rutinas for select to authenticated
using (auth_role() in ('admin_sede', 'super_admin'));

create policy "rutinas_insert_profesional"
on rutinas for insert to authenticated
with check (auth_role() = 'profesional' and profesional_id = auth.uid());

create policy "rutinas_update_profesional_propio"
on rutinas for update to authenticated
using (profesional_id = auth.uid());

-- ---------- RUTINA_EJERCICIOS ----------
create table rutina_ejercicios (
  id uuid primary key default gen_random_uuid(),
  rutina_id uuid not null references rutinas(id) on delete cascade,
  ejercicio_id uuid not null references ejercicios(id),
  series integer not null,
  repeticiones integer not null,
  orden integer not null default 0,
  notas text
);

create index idx_rutina_ejercicios_rutina on rutina_ejercicios(rutina_id);

alter table rutina_ejercicios enable row level security;

-- Sin auth_role() directo aquí: la visibilidad depende de si el usuario
-- puede ver la rutina padre (profesional dueño o cliente asignado).
create policy "rutina_ejercicios_select_via_rutina"
on rutina_ejercicios for select to authenticated
using (
  exists (
    select 1 from rutinas r
    where r.id = rutina_ejercicios.rutina_id
      and (r.profesional_id = auth.uid() or r.cliente_id = auth.uid())
  )
  or auth_role() in ('admin_sede', 'super_admin')
);

create policy "rutina_ejercicios_insert_via_rutina"
on rutina_ejercicios for insert to authenticated
with check (
  exists (
    select 1 from rutinas r
    where r.id = rutina_ejercicios.rutina_id and r.profesional_id = auth.uid()
  )
);

create policy "rutina_ejercicios_update_via_rutina"
on rutina_ejercicios for update to authenticated
using (
  exists (
    select 1 from rutinas r
    where r.id = rutina_ejercicios.rutina_id and r.profesional_id = auth.uid()
  )
);

create policy "rutina_ejercicios_delete_via_rutina"
on rutina_ejercicios for delete to authenticated
using (
  exists (
    select 1 from rutinas r
    where r.id = rutina_ejercicios.rutina_id and r.profesional_id = auth.uid()
  )
);

-- ---------- MEJORA A PAGOS: comprobante fotográfico ----------
alter table pagos add column if not exists comprobante_url text;

-- ---------- KPIs para Dashboard (admin_sede / super_admin) ----------
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

  if v_actor_role not in ('admin_sede', 'super_admin') then
    raise exception 'No autorizado';
  end if;

  if v_actor_role <> 'super_admin' and p_sede_id <> v_actor_sede then
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

grant execute on function obtener_kpis_sede(uuid) to authenticated;