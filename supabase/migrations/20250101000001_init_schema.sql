-- ============================================
-- GYMTRACK 360 - Esquema inicial
-- ============================================

-- gen_random_uuid() viene de pgcrypto, ya habilitado por defecto en Supabase.
-- No necesitamos crear ninguna extensión manualmente.

-- ---------- SEDES ----------
create table sedes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- PROFILES (extiende auth.users) ----------
create type user_role as enum (
  'super_admin',
  'admin_sede',
  'recepcionista',
  'profesional',
  'cliente'
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  apellido text not null,
  role user_role not null default 'cliente',
  sede_id uuid references sedes(id),
  qr_code text unique, -- solo aplica a role = cliente
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- PLANES ----------
create table planes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  precio numeric(10,2) not null,
  duracion_dias integer not null,
  es_multisede boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- MEMBRESIAS ----------
create type membresia_estado as enum ('activa', 'vencida', 'cancelada');

create table membresias (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid not null references planes(id),
  sede_origen_id uuid not null references sedes(id),
  fecha_inicio date not null,
  fecha_fin date not null,
  estado membresia_estado not null default 'activa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- PAGOS ----------
create table pagos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references profiles(id),
  membresia_id uuid not null references membresias(id),
  sede_id uuid not null references sedes(id),
  monto numeric(10,2) not null,
  metodo_pago text not null,
  fecha timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------- ASISTENCIAS ----------
create table asistencias (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references profiles(id),
  sede_id uuid not null references sedes(id),
  fecha_hora timestamptz not null default now()
);

-- ============================================
-- ÍNDICES DE ALTA VELOCIDAD (obligatorios)
-- ============================================
create index idx_profiles_qr_code on profiles(qr_code);
create index idx_asistencias_sede_fecha on asistencias(sede_id, fecha_hora desc);
create index idx_profiles_sede_role on profiles(sede_id, role);
create index idx_membresias_cliente_estado on membresias(cliente_id, estado);
create index idx_membresias_cliente_fecha_fin on membresias(cliente_id, fecha_fin desc);

-- ============================================
-- Trigger genérico para updated_at
-- ============================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_sedes_updated_at before update on sedes
  for each row execute function set_updated_at();
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_planes_updated_at before update on planes
  for each row execute function set_updated_at();
create trigger trg_membresias_updated_at before update on membresias
  for each row execute function set_updated_at();