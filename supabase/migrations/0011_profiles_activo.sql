-- 0011_profiles_activo.sql
-- Agrega el campo "activo" a profiles para poder desactivar usuarios
-- sin borrarlos (el borrado real de Auth requiere service_role, no se
-- hace desde el cliente). Mismo patron que sedes.activa.

alter table public.profiles
  add column if not exists activo boolean not null default true;

comment on column public.profiles.activo is
  'Usuario habilitado para operar en el sistema. false = desactivado (no se borra el registro).';