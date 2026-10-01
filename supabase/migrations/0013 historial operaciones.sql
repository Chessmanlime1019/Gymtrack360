-- 0013_historial_operaciones.sql
-- Historial de operaciones: registro automatico de altas/cambios/bajas
-- en las tablas clave del sistema, via trigger (no hace falta tocar
-- ninguno de los services ya hechos -- el registro ocurre solo).

create table if not exists public.historial_operaciones (
  id uuid primary key default gen_random_uuid(),
  tabla text not null,
  operacion text not null check (operacion in ('INSERT', 'UPDATE', 'DELETE')),
  registro_id uuid,
  sede_id uuid references public.sedes(id),
  actor_id uuid references auth.users(id),
  detalle jsonb,
  created_at timestamptz not null default now()
);

create index if not exists historial_operaciones_created_at_idx
  on public.historial_operaciones (created_at desc);
create index if not exists historial_operaciones_sede_id_idx
  on public.historial_operaciones (sede_id);

-- Solo el backend (via esta funcion) escribe aqui; nadie inserta a mano.
alter table public.historial_operaciones enable row level security;

create policy "staff puede leer el historial de su alcance"
  on public.historial_operaciones for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('super_admin', 'admin_sede')
        and (p.role = 'super_admin' or p.sede_id = historial_operaciones.sede_id)
    )
  );

-- Funcion generica de trigger: arma el registro leyendo NEW/OLD con
-- to_jsonb, asi sirve para cualquier tabla sin repetir codigo.
-- sede_id se intenta sacar de columnas comunes (sede_id, sede_origen_id);
-- si la tabla no tiene ninguna (p.ej. "sedes" o "planes" global), queda null.
create or replace function public.fn_registrar_operacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fila jsonb;
  sede uuid;
begin
  fila := case when TG_OP = 'DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
  sede := coalesce(
    nullif(fila->>'sede_id', '')::uuid,
    nullif(fila->>'sede_origen_id', '')::uuid
  );

  insert into public.historial_operaciones (tabla, operacion, registro_id, sede_id, actor_id, detalle)
  values (
    TG_TABLE_NAME,
    TG_OP,
    (fila->>'id')::uuid,
    sede,
    auth.uid(),
    fila
  );

  return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$$;

-- Tablas que se auditan. profiles queda fuera a proposito en INSERT para
-- no llenar el historial con cada auto-registro de cliente; solo se
-- audita cuando cambia algo relevante de staff (UPDATE), y la creacion
-- de staff ya queda registrada aparte porque pasa por admin-crear-usuario.
drop trigger if exists trg_historial_profiles on public.profiles;
create trigger trg_historial_profiles
  after update on public.profiles
  for each row
  when (OLD.role is distinct from NEW.role
     or OLD.activo is distinct from NEW.activo
     or OLD.sede_id is distinct from NEW.sede_id)
  execute function public.fn_registrar_operacion();

drop trigger if exists trg_historial_sedes on public.sedes;
create trigger trg_historial_sedes
  after insert or update on public.sedes
  for each row execute function public.fn_registrar_operacion();

drop trigger if exists trg_historial_planes on public.planes;
create trigger trg_historial_planes
  after insert or update on public.planes
  for each row execute function public.fn_registrar_operacion();

drop trigger if exists trg_historial_membresias on public.membresias;
create trigger trg_historial_membresias
  after insert or update on public.membresias
  for each row execute function public.fn_registrar_operacion();

drop trigger if exists trg_historial_pagos on public.pagos;
create trigger trg_historial_pagos
  after insert on public.pagos
  for each row execute function public.fn_registrar_operacion();