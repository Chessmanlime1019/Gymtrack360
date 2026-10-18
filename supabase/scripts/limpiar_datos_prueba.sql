-- =====================================================================
-- GYMTRACK 360 · Limpieza de datos de prueba (se ejecuta UNA sola vez)
-- =====================================================================
-- Deja el sistema vacío y listo para usar con datos reales.
--
-- SE CONSERVA:  la cuenta superadmin.test2@gymtrack.test, las sedes, los
--               planes y el catálogo de ejercicios.
-- SE BORRA:     todas las demás cuentas (Auth + perfil) y TODOS los datos
--               operativos: membresías, pagos, solicitudes de pago,
--               asistencias, rutinas, mediciones, vínculos profesional-cliente,
--               avisos, notificaciones e historial de operaciones.
--
-- ⚠ NO SE PUEDE DESHACER. Haz un backup antes si quieres conservar algo
--   (Supabase > Database > Backups, o exporta las tablas a CSV).
--
-- Uso (Supabase > SQL Editor):
--   1) Ejecuta solo el PASO 1 y revisa los números.
--   2) Ejecuta el PASO 2. Si algo falla, no se borra nada (es atómico).
--   3) Vacía a mano los buckets de Storage (ver PASO 3).
-- =====================================================================


-- ---------------------------------------------------------------------
-- PASO 1 · Vista previa (no borra nada)
-- ---------------------------------------------------------------------
select 'super admin que se conserva' as que,
       (select count(*) from auth.users where lower(email) = 'superadmin.test2@gymtrack.test')::text as cantidad
union all select 'cuentas que se borrarán',
       (select count(*) from auth.users where lower(email) <> 'superadmin.test2@gymtrack.test')::text
union all select 'membresías', (select count(*) from public.membresias)::text
union all select 'pagos', (select count(*) from public.pagos)::text
union all select 'solicitudes de pago', (select count(*) from public.solicitudes_pago)::text
union all select 'asistencias', (select count(*) from public.asistencias)::text
union all select 'rutinas', (select count(*) from public.rutinas)::text
union all select 'mediciones', (select count(*) from public.mediciones)::text
union all select 'avisos', (select count(*) from public.avisos)::text
union all select 'notificaciones', (select count(*) from public.notificaciones)::text
union all select 'historial', (select count(*) from public.historial_operaciones)::text
union all select 'SE CONSERVAN → sedes', (select count(*) from public.sedes)::text
union all select 'SE CONSERVAN → planes', (select count(*) from public.planes)::text
union all select 'SE CONSERVAN → ejercicios', (select count(*) from public.ejercicios)::text;


-- ---------------------------------------------------------------------
-- PASO 2 · Limpieza
-- ---------------------------------------------------------------------
do $$
declare
  v_admin uuid;
  v_desconocidas text;
begin
  -- Seguridad 1: la cuenta que se conserva tiene que existir y ser super_admin.
  select id into v_admin from auth.users where lower(email) = 'superadmin.test2@gymtrack.test';
  if v_admin is null then
    raise exception 'No existe superadmin.test2@gymtrack.test. No se borró nada.';
  end if;
  if (select role::text from public.profiles where id = v_admin) is distinct from 'super_admin' then
    raise exception 'superadmin.test2@gymtrack.test no tiene rol super_admin. No se borró nada.';
  end if;

  -- Seguridad 2: si existe alguna tabla que apunte a usuarios y este script
  -- no conoce (creada a mano en el Dashboard), se detiene en vez de dejar
  -- datos huérfanos.
  select string_agg(distinct c.relname, ', ') into v_desconocidas
  from pg_constraint k
  join pg_class c on c.oid = k.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where k.contype = 'f'
    and n.nspname = 'public'
    and k.confrelid in ('public.profiles'::regclass, 'auth.users'::regclass)
    and c.relname not in (
      'profiles', 'membresias', 'pagos', 'asistencias', 'profesional_clientes',
      'rutinas', 'mediciones', 'avisos', 'notificaciones', 'solicitudes_pago',
      'historial_operaciones'
    );
  if v_desconocidas is not null then
    raise exception 'Hay tablas que este script no conoce: %. No se borró nada.', v_desconocidas;
  end if;

  -- Orden: primero lo que depende de otras tablas.
  delete from public.solicitudes_pago;
  delete from public.rutina_ejercicios;
  delete from public.rutinas;
  delete from public.mediciones;
  delete from public.asistencias;
  delete from public.pagos;
  delete from public.membresias;
  delete from public.profesional_clientes;
  delete from public.avisos;
  delete from public.historial_operaciones;   -- apunta a auth.users sin cascade

  -- Cuentas: borrar en Auth elimina en cascada el perfil, sesiones e identidades.
  delete from auth.users where id <> v_admin;

  -- Al final, porque los borrados de arriba pueden generar notificaciones.
  delete from public.notificaciones;
  delete from public.historial_operaciones;

  raise notice 'Limpieza completa. Queda solo superadmin.test2@gymtrack.test.';
end;
$$;

-- Comprobación (debe mostrar 1 cuenta y 0 en lo demás)
select 'cuentas' as que, (select count(*) from auth.users) as cantidad
union all select 'perfiles', (select count(*) from public.profiles)
union all select 'membresías', (select count(*) from public.membresias)
union all select 'pagos', (select count(*) from public.pagos)
union all select 'asistencias', (select count(*) from public.asistencias)
union all select 'notificaciones', (select count(*) from public.notificaciones);


-- ---------------------------------------------------------------------
-- PASO 3 · Archivos (a mano)
-- ---------------------------------------------------------------------
-- Supabase no permite borrar archivos de Storage con SQL. En el Dashboard:
--   Storage > avatars      > selecciona todo > Delete
--     (conserva la carpeta del super admin si tiene foto de perfil)
--   Storage > comprobantes > selecciona todo > Delete
