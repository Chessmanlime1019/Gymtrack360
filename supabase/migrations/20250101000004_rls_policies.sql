-- ============================================
-- GYMTRACK 360 - Row Level Security por sede
-- ============================================

-- ---------- FUNCIONES HELPER ----------
-- security definer para evitar recursión infinita al leer profiles
-- (si no, cada policy sobre profiles tendría que consultar profiles, ciclo infinito)

create or replace function auth_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_sede_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select sede_id from profiles where id = auth.uid();
$$;

-- ============================================
-- ACTIVAR RLS EN TODAS LAS TABLAS
-- ============================================
alter table sedes enable row level security;
alter table profiles enable row level security;
alter table planes enable row level security;
alter table membresias enable row level security;
alter table pagos enable row level security;
alter table asistencias enable row level security;

-- ============================================
-- SEDES
-- Todos los autenticados pueden listarlas (para selects/dropdowns).
-- Solo super_admin puede crear/editar/eliminar sedes.
-- ============================================
create policy "sedes_select_autenticados"
on sedes for select to authenticated using (true);

create policy "sedes_insert_super_admin"
on sedes for insert to authenticated
with check (auth_role() = 'super_admin');

create policy "sedes_update_super_admin"
on sedes for update to authenticated
using (auth_role() = 'super_admin');

create policy "sedes_delete_super_admin"
on sedes for delete to authenticated
using (auth_role() = 'super_admin');

-- ============================================
-- PROFILES
-- - Cada quien ve su propio perfil.
-- - Staff (admin_sede, recepcionista, profesional) ve perfiles de SU sede.
-- - super_admin ve todo.
-- ============================================
create policy "profiles_select_propio"
on profiles for select to authenticated
using (id = auth.uid());

create policy "profiles_select_staff_su_sede"
on profiles for select to authenticated
using (
  auth_role() in ('admin_sede', 'recepcionista', 'profesional')
  and sede_id = auth_sede_id()
);

create policy "profiles_select_super_admin"
on profiles for select to authenticated
using (auth_role() = 'super_admin');

create policy "profiles_update_propio"
on profiles for update to authenticated
using (id = auth.uid());

create policy "profiles_update_admin_sede_su_sede"
on profiles for update to authenticated
using (auth_role() = 'admin_sede' and sede_id = auth_sede_id());

create policy "profiles_update_super_admin"
on profiles for update to authenticated
using (auth_role() = 'super_admin');

-- Trigger anti-escalamiento de privilegios:
-- nadie puede auto-asignarse role/sede_id distinto sin ser admin_sede/super_admin,
-- y admin_sede no puede crear otro admin_sede/super_admin ni sacar gente de su sede.
create or replace function prevent_role_escalation()
returns trigger as $$
declare
  actor_role user_role;
  actor_sede uuid;
begin
  -- si no hay sesión de usuario (ej. service_role desde un panel admin seguro), permitir
  if auth.uid() is null then
    return new;
  end if;

  actor_role := auth_role();
  actor_sede := auth_sede_id();

  if actor_role = 'super_admin' then
    return new;
  end if;

  if actor_role = 'admin_sede' then
    if new.role in ('super_admin', 'admin_sede') then
      raise exception 'admin_sede no puede asignar ese rol';
    end if;
    if new.sede_id is distinct from actor_sede then
      raise exception 'admin_sede no puede mover perfiles fuera de su sede';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role or new.sede_id is distinct from old.sede_id then
    raise exception 'No tienes permiso para cambiar role o sede_id';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_prevent_role_escalation
before update on profiles
for each row execute function prevent_role_escalation();

-- Trigger que crea el profile automáticamente al registrarse en auth.users.
-- SIEMPRE fuerza role = 'cliente' sin importar qué mande el frontend,
-- así nadie puede auto-registrarse como admin.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nombre, apellido, role, sede_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    'cliente',
    (new.raw_user_meta_data->>'sede_id')::uuid
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_handle_new_user
after insert on auth.users
for each row execute function handle_new_user();

-- ============================================
-- PLANES
-- Lectura abierta a autenticados, escritura solo admin_sede/super_admin.
-- ============================================
create policy "planes_select_autenticados"
on planes for select to authenticated using (true);

create policy "planes_insert_admin"
on planes for insert to authenticated
with check (auth_role() in ('admin_sede', 'super_admin'));

create policy "planes_update_admin"
on planes for update to authenticated
using (auth_role() in ('admin_sede', 'super_admin'));

-- ============================================
-- MEMBRESIAS
-- Cliente ve las suyas. Staff ve las de su sede (sede_origen_id).
-- super_admin ve todo.
-- ============================================
create policy "membresias_select_cliente"
on membresias for select to authenticated
using (cliente_id = auth.uid());

create policy "membresias_select_staff_su_sede"
on membresias for select to authenticated
using (
  auth_role() in ('admin_sede', 'recepcionista', 'profesional')
  and sede_origen_id = auth_sede_id()
);

create policy "membresias_select_super_admin"
on membresias for select to authenticated
using (auth_role() = 'super_admin');

create policy "membresias_insert_staff"
on membresias for insert to authenticated
with check (
  auth_role() in ('admin_sede', 'recepcionista', 'super_admin')
  and (auth_role() = 'super_admin' or sede_origen_id = auth_sede_id())
);

create policy "membresias_update_staff"
on membresias for update to authenticated
using (
  auth_role() in ('admin_sede', 'recepcionista', 'super_admin')
  and (auth_role() = 'super_admin' or sede_origen_id = auth_sede_id())
);

-- ============================================
-- PAGOS
-- Registros financieros: sin update/delete vía RLS (inmutables).
-- ============================================
create policy "pagos_select_cliente"
on pagos for select to authenticated
using (cliente_id = auth.uid());

create policy "pagos_select_staff_su_sede"
on pagos for select to authenticated
using (
  auth_role() in ('admin_sede', 'recepcionista')
  and sede_id = auth_sede_id()
);

create policy "pagos_select_super_admin"
on pagos for select to authenticated
using (auth_role() = 'super_admin');

create policy "pagos_insert_staff"
on pagos for insert to authenticated
with check (
  auth_role() in ('admin_sede', 'recepcionista', 'super_admin')
  and (auth_role() = 'super_admin' or sede_id = auth_sede_id())
);

-- ============================================
-- ASISTENCIAS
-- IMPORTANTE: NO hay policy de insert aquí a propósito.
-- Los inserts SOLO pueden pasar por la función RPC validar_acceso_qr
-- (SECURITY DEFINER, la crearemos en 0003), que bypassea RLS de forma
-- controlada. Así nadie puede insertar una asistencia falsa directo
-- contra la tabla, ni siquiera un cliente autenticado.
-- ============================================
create policy "asistencias_select_cliente"
on asistencias for select to authenticated
using (cliente_id = auth.uid());

create policy "asistencias_select_staff_su_sede"
on asistencias for select to authenticated
using (
  auth_role() in ('admin_sede', 'recepcionista', 'profesional')
  and sede_id = auth_sede_id()
);

create policy "asistencias_select_super_admin"
on asistencias for select to authenticated
using (auth_role() = 'super_admin');