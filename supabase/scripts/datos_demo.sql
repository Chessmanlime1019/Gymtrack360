-- =====================================================================
-- GYMTRACK 360 · Datos de demostración
-- =====================================================================
-- Llena el sistema con datos realistas para presentarlo funcionando:
--   · Personal por sede: 1 admin de sede, 1 recepción y 2 entrenadores.
--   · 48 clientes (16 por sede) con meses de historia: membresías vigentes,
--     por vencer, vencidas, canceladas y renovaciones, sus pagos, asistencias
--     con horas punta reales, rutinas, mediciones, avisos y 2 pagos por confirmar.
--
-- Todas las cuentas usan el dominio @demo.gymtrack.pe y la contraseña
--     GymTrack2026!
-- Se pueden borrar en cualquier momento con la LIMPIEZA del final, sin tocar
-- los datos reales. Las sedes y planes existentes se reutilizan; si no hay
-- planes activos, se crean 4 planes estándar.
--
-- Requiere la migración 0028 (aforo).
-- Uso: Supabase > SQL Editor > ejecutar PASO 1 (todo hasta el "fin del paso 1").
-- =====================================================================


-- ---------------------------------------------------------------------
-- PASO 1 · Cargar datos
-- ---------------------------------------------------------------------

-- Crea una cuenta (Auth + perfil). El perfil lo crea el trigger de registro;
-- aquí solo se ajusta el rol y la fecha de alta.
create or replace function pg_temp.demo_usuario(
  p_email text, p_nombre text, p_apellido text, p_sede uuid, p_rol text, p_creado timestamptz
) returns uuid language plpgsql as $f$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('GymTrack2026!', extensions.gen_salt('bf')), p_creado,
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nombre', p_nombre, 'apellido', p_apellido, 'sede_id', p_sede),
    p_creado, p_creado, '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
          'email', p_creado, p_creado, p_creado);
  update public.profiles set role = p_rol::user_role, created_at = p_creado where id = v_id;
  return v_id;
end $f$;

-- Momento en hora de Lima -> timestamptz
create or replace function pg_temp.lima(p_dia date, p_hora int, p_min int) returns timestamptz
language sql as $f$ select (p_dia + make_time(p_hora, p_min, 0)) at time zone 'America/Lima' $f$;

-- Hora de visita al gimnasio: mañana temprano o noche, como en la realidad.
create or replace function pg_temp.hora_visita() returns int language sql as $f$
  select case
    when r < 0.38 then 6 + floor(random() * 3)::int      -- 6 a 8 a. m.
    when r < 0.52 then 10 + floor(random() * 5)::int     -- 10 a. m. a 2 p. m.
    else 17 + floor(random() * 5)::int                   -- 5 a 9 p. m. (hora punta)
  end from (select random() as r) x
$f$;

do $$
declare
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_hora_actual int := extract(hour from now() at time zone 'America/Lima')::int;
  v_sedes uuid[];
  v_sede uuid;
  v_profes uuid[];
  v_admin uuid;
  v_admin_1 uuid;
  v_t int;
  v_entrada timestamptz;
  v_salida timestamptz;
  v_plan record;
  v_cli uuid;
  v_memb uuid;
  v_ini date;
  v_fin date;
  v_estado text;
  v_r float;
  v_asist float;
  v_hora int;
  v_d date;
  v_k int := 0;
  v_metodo text;
  v_rutina uuid;
  v_prof uuid;
  v_asignados int;
  v_peso numeric;
  v_leads uuid[] := '{}';
  v_ej uuid[];
  i int; j int; n int;

  nombres text[] := array[
    'Joaquín','Valeria','Diego','Camila','Mateo','Lucía','Sebastián','Daniela','Luis','Fernanda',
    'Carlos','Andrea','Renzo','Ximena','Gonzalo','Mariana','Jorge','Alejandra','Andrés','Rosa',
    'Kevin','Milagros','Bruno','Karen','Piero','Paola','Fernando','Sofía','Miguel','Brenda',
    'Álvaro','Nicole','Rodrigo','Gabriela','Erick','Stephany','Junior','Katherine','Frank','Yesenia',
    'Christian','Leslie','Marco','Diana','Jhon','Melissa','Raúl','Angela'];
  apellidos text[] := array[
    'Quispe','Flores','Rojas','Mendoza','Torres','Huamán','Gutiérrez','Chávez','Ramírez','Vargas',
    'Castillo','Salazar','Paredes','Cárdenas','Morales','Ríos','Espinoza','Díaz','Vásquez','Sánchez',
    'Campos','Navarro','Ruiz','Medina','Córdova','Ccahuana','Ticona','Mamani','Palacios','Zapata'];
  staff text[][] := array[
    ['Ricardo','Salinas'],['Patricia','Herrera'],['Hugo','Ventura'],['Lorena','Aguilar'],
    ['Martín','Delgado'],['Claudia','Peña'],['Óscar','Valdivia'],['Susana','Cabrera'],
    ['Julio','Arana'],['Verónica','Lazo'],['César','Montes'],['Carla','Benites']];
  rutinas_tipo text[][] := array[
    ['Hipertrofia full body','Ganar masa muscular','Intermedio','8'],
    ['Pérdida de grasa','Bajar de peso','Principiante','6'],
    ['Fuerza base','Ganar fuerza','Intermedio','10'],
    ['Acondicionamiento general','Mejorar resistencia','Principiante','4']];
  metodos text[] := array['Yape','Yape','Yape','Efectivo','Efectivo','Efectivo','Plin','Transferencia'];
begin
  perform setseed(0.36);

  if exists (select 1 from auth.users where email like '%@demo.gymtrack.pe') then
    raise exception 'Los datos de demostración ya están cargados. Ejecuta primero la LIMPIEZA del final.';
  end if;

  select array_agg(id order by nombre) into v_sedes from public.sedes where activa;
  if coalesce(array_length(v_sedes, 1), 0) = 0 then
    raise exception 'No hay sedes activas.';
  end if;

  -- Aforo de ejemplo para ver el medidor; se cambia en Sedes.
  update public.sedes set aforo_maximo = 60 where activa and aforo_maximo is null;

  -- Planes: se usan los que existen; si no hay, se crean los estándar.
  if not exists (select 1 from public.planes where activo) then
    insert into public.planes (nombre, precio, duracion_dias, es_multisede, activo, sede_id) values
      ('Mensual', 120, 30, false, true, null),
      ('Trimestral', 320, 90, false, true, null),
      ('Semestral', 580, 180, false, true, null),
      ('Anual Multisede', 1050, 365, true, true, null);
  end if;

  -- Catálogo de ejercicios mínimo para las rutinas.
  insert into public.ejercicios (nombre, grupo_muscular, equipo)
  select e.nombre, e.grupo, e.equipo
  from (values
    ('Press de banca', 'Pecho', 'Barra'), ('Aperturas con mancuernas', 'Pecho', 'Mancuernas'),
    ('Sentadilla', 'Piernas', 'Barra'), ('Prensa de piernas', 'Piernas', 'Máquina'),
    ('Peso muerto rumano', 'Piernas', 'Barra'), ('Jalón al pecho', 'Espalda', 'Polea'),
    ('Remo con mancuerna', 'Espalda', 'Mancuernas'), ('Press militar', 'Hombros', 'Mancuernas'),
    ('Elevaciones laterales', 'Hombros', 'Mancuernas'), ('Curl de bíceps', 'Brazos', 'Mancuernas'),
    ('Extensión de tríceps en polea', 'Brazos', 'Polea'), ('Plancha abdominal', 'Core', 'Peso corporal'),
    ('Bicicleta estática', 'Cardio', 'Máquina'), ('Zancadas', 'Piernas', 'Mancuernas')
  ) as e(nombre, grupo, equipo)
  where not exists (select 1 from public.ejercicios x where lower(x.nombre) = lower(e.nombre));
  select array_agg(id) into v_ej from public.ejercicios;

  for i in 1 .. array_length(v_sedes, 1) loop
    v_sede := v_sedes[i];

    -- ------------------------------------------------ personal de la sede
    v_admin := pg_temp.demo_usuario('admin.sede' || i || '@demo.gymtrack.pe',
      staff[(i - 1) * 4 + 1][1], staff[(i - 1) * 4 + 1][2], v_sede, 'admin_sede', now() - interval '200 days');
    if i = 1 then v_admin_1 := v_admin; end if;
    perform pg_temp.demo_usuario('recepcion.sede' || i || '@demo.gymtrack.pe',
      staff[(i - 1) * 4 + 2][1], staff[(i - 1) * 4 + 2][2], v_sede, 'recepcionista', now() - interval '190 days');
    v_profes := array[
      pg_temp.demo_usuario('entrenador1.sede' || i || '@demo.gymtrack.pe',
        staff[(i - 1) * 4 + 3][1], staff[(i - 1) * 4 + 3][2], v_sede, 'profesional', now() - interval '185 days'),
      pg_temp.demo_usuario('entrenador2.sede' || i || '@demo.gymtrack.pe',
        staff[(i - 1) * 4 + 4][1], staff[(i - 1) * 4 + 4][2], v_sede, 'profesional', now() - interval '150 days')];

    -- Aviso de la sede
    insert into public.avisos (sede_id, titulo, mensaje, tipo, fijado, vence_en, publicado_por, created_at)
    values (v_sede, 'Nuevo horario de fin de semana',
            'Desde este sábado atendemos de 7:00 a. m. a 2:00 p. m. Los domingos, de 8:00 a. m. a 12:00 m.',
            'importante', i = 1, v_hoy + 20, v_admin, now() - interval '3 days');

    -- ------------------------------------------------ clientes de la sede
    v_asignados := 0;
    for j in 1 .. 16 loop
      v_k := v_k + 1;
      n := v_k;
      v_r := random();

      v_cli := pg_temp.demo_usuario(
        translate(lower(nombres[1 + (n - 1) % 48] || '.' || apellidos[1 + (n * 7) % 30]), 'áéíóúñ', 'aeioun')
          || n || '@demo.gymtrack.pe',
        nombres[1 + (n - 1) % 48],
        apellidos[1 + (n * 7) % 30] || ' ' || apellidos[1 + (n * 13 + 5) % 30],
        v_sede, 'cliente', now() - ((25 + floor(random() * 150)::int) || ' days')::interval);

      -- Sin membresía (interesados): algunos dejan un pago por confirmar.
      if v_r < 0.10 then
        v_leads := v_leads || v_cli;
        continue;
      end if;

      -- Plan: el mensual es el más vendido.
      select * into v_plan from public.planes
      where activo and (sede_id is null or sede_id = v_sede)
      order by case when random() < 0.65 then duracion_dias else random() * 400 end
      limit 1;

      if v_r < 0.22 then                      -- vencida
        v_fin := v_hoy - (3 + floor(random() * 35)::int);
        v_ini := v_fin - v_plan.duracion_dias;
        v_estado := case when random() < 0.5 then 'vencida' else 'activa' end;
      elsif v_r < 0.27 then                   -- cancelada
        v_ini := v_hoy - (5 + floor(random() * 15)::int);
        v_fin := v_ini + v_plan.duracion_dias;
        v_estado := 'cancelada';
      elsif v_r < 0.42 then                   -- por vencer (0 a 7 días)
        v_fin := v_hoy + floor(random() * 8)::int;
        v_ini := v_fin - v_plan.duracion_dias;
        v_estado := 'activa';
      else                                    -- vigente
        v_ini := case when n % 11 = 0 then v_hoy
                      else v_hoy - floor(random() * greatest(v_plan.duracion_dias - 9, 1))::int end;
        v_fin := v_ini + v_plan.duracion_dias;
        v_estado := 'activa';
      end if;

      -- Renovación: la mitad de los vigentes ya tenía un plan mensual antes.
      if v_estado = 'activa' and v_fin >= v_hoy and random() < 0.5 then
        insert into public.membresias (cliente_id, plan_id, sede_origen_id, fecha_inicio, fecha_fin, estado, created_at)
        select v_cli, p.id, v_sede, v_ini - p.duracion_dias, v_ini, 'vencida', pg_temp.lima(v_ini - p.duracion_dias, 9, 0)
        from public.planes p where p.activo and (p.sede_id is null or p.sede_id = v_sede)
        order by p.duracion_dias limit 1
        returning id into v_memb;
        v_metodo := metodos[1 + floor(random() * 8)::int];
        insert into public.pagos (cliente_id, membresia_id, sede_id, monto, metodo_pago, fecha)
        select v_cli, v_memb, v_sede, p.precio, v_metodo, pg_temp.lima(m.fecha_inicio, pg_temp.hora_visita(), floor(random() * 60)::int)
        from public.membresias m join public.planes p on p.id = m.plan_id where m.id = v_memb;
      end if;

      v_hora := pg_temp.hora_visita();
      if v_ini = v_hoy then v_hora := greatest(6, least(v_hora, v_hora_actual)); end if;

      insert into public.membresias (cliente_id, plan_id, sede_origen_id, fecha_inicio, fecha_fin, estado, created_at)
      values (v_cli, v_plan.id, v_sede, v_ini, v_fin, v_estado::membresia_estado, pg_temp.lima(v_ini, v_hora, 0))
      returning id into v_memb;

      insert into public.pagos (cliente_id, membresia_id, sede_id, monto, metodo_pago, fecha)
      values (v_cli, v_memb, v_sede, v_plan.precio, metodos[1 + floor(random() * 8)::int],
              pg_temp.lima(v_ini, v_hora, floor(random() * 60)::int));

      -- Asistencias de los últimos 60 días dentro de la vigencia.
      v_asist := 0.40 + random() * 0.40;      -- constancia propia de cada cliente
      v_d := greatest(v_ini, v_hoy - 60);
      while v_d <= least(v_fin, v_hoy) and v_estado <> 'cancelada' loop
        if random() < v_asist and extract(isodow from v_d) <> 7 then
          v_hora := pg_temp.hora_visita();
          if v_d < v_hoy or v_hora < v_hora_actual then
            v_entrada := pg_temp.lima(v_d, v_hora, floor(random() * 60)::int);
            v_salida := v_entrada + ((45 + floor(random() * 65)::int) || ' minutes')::interval;
            -- Quien aún no termina sigue dentro; 1 de cada 5 olvida escanear al salir.
            insert into public.asistencias (cliente_id, sede_id, fecha_hora, salida_at)
            values (v_cli, case when v_plan.es_multisede and random() < 0.15
                                then v_sedes[1 + floor(random() * array_length(v_sedes, 1))::int] else v_sede end,
                    v_entrada,
                    case when v_salida < now() and random() < 0.8 then v_salida end);
          end if;
        end if;
        v_d := v_d + 1;
      end loop;

      -- Entrenador a cargo, rutina y mediciones (clientes con plan vigente).
      if v_estado = 'activa' and v_fin >= v_hoy and v_asignados < 10 then
        v_asignados := v_asignados + 1;
        v_prof := v_profes[1 + v_asignados % 2];
        insert into public.profesional_clientes (profesional_id, cliente_id, sede_id, created_at)
        values (v_prof, v_cli, v_sede, pg_temp.lima(v_ini, 10, 0));

        if random() < 0.8 then
          v_t := 1 + floor(random() * 4)::int;
          insert into public.rutinas (profesional_id, cliente_id, nombre, descripcion, activa, objetivo, nivel, semanas, created_at)
          values (v_prof, v_cli, rutinas_tipo[v_t][1], 'Plan de 3 días por semana con progresión de cargas.', true,
                  rutinas_tipo[v_t][2], rutinas_tipo[v_t][3], rutinas_tipo[v_t][4]::int, pg_temp.lima(v_ini + 1, 11, 0))
          returning id into v_rutina;

          insert into public.rutina_ejercicios (rutina_id, ejercicio_id, series, repeticiones, orden, dia, descanso_seg, peso_sugerido)
          select v_rutina, v_ej[1 + floor(random() * array_length(v_ej, 1))::int],
                 3 + floor(random() * 2)::int, (array[8, 10, 12, 15])[1 + floor(random() * 4)::int],
                 o, dia, (array[45, 60, 90])[1 + floor(random() * 3)::int],
                 (array['Moderado', '10 kg', '15 kg', '20 kg', 'Peso corporal'])[1 + floor(random() * 5)::int]
          from generate_series(1, 3) dia, generate_series(1, 4) o;
        end if;

        v_peso := 62 + floor(random() * 28);
        for o in 0 .. 3 loop
          insert into public.mediciones (cliente_id, fecha, peso_kg, grasa_pct, cintura_cm, registrado_por, created_at)
          values (v_cli, v_hoy - (90 - o * 28), v_peso - o * (0.6 + random()), 18 + random() * 10 - o * 0.8,
                  82 + random() * 14 - o * 1.2, v_prof, pg_temp.lima(v_hoy - (90 - o * 28), 18, 30));
        end loop;
      end if;
    end loop;
  end loop;

  -- Avisos para todas las sedes
  insert into public.avisos (sede_id, titulo, mensaje, tipo, fijado, vence_en, publicado_por, created_at) values
    (null, 'Promoción de verano: 2 meses por S/ 199',
     'Inscríbete o renueva tu plan hasta fin de mes y paga solo S/ 199 por 2 meses. Válido en todas las sedes.',
     'promo', true, v_hoy + 25, v_admin_1, now() - interval '1 day'),
    (null, 'Nueva clase de entrenamiento funcional',
     'Martes y jueves a las 7:00 p. m. Cupos limitados: inscríbete en recepción.',
     'info', false, v_hoy + 30, v_admin_1, now() - interval '6 days');

  -- Dos pagos con Yape pendientes de confirmar en recepción
  for i in 1 .. least(2, coalesce(array_length(v_leads, 1), 0)) loop
    insert into public.solicitudes_pago (cliente_id, plan_id, sede_id, monto, metodo_pago, numero_operacion, created_at)
    select p.id, pl.id, p.sede_id, pl.precio, 'Yape', lpad((10000000 + floor(random() * 89999999))::bigint::text, 8, '0'),
           now() - ((10 + i * 25) || ' minutes')::interval
    from public.profiles p
    cross join lateral (select * from public.planes where activo and (sede_id is null or sede_id = p.sede_id)
                        order by duracion_dias limit 1) pl
    where p.id = v_leads[i];
  end loop;

  -- Los triggers notifican cada operación; para la demo no hacen falta cientos.
  delete from public.notificaciones
  where usuario_id in (select p.id from public.profiles p join auth.users u on u.id = p.id
                       where u.email like '%@demo.gymtrack.pe');

  raise notice 'Demo cargada: % clientes, % membresías, % pagos, % asistencias.',
    (select count(*) from public.profiles p join auth.users u on u.id = p.id
      where u.email like '%@demo.gymtrack.pe' and p.role = 'cliente'),
    (select count(*) from public.membresias m join auth.users u on u.id = m.cliente_id where u.email like '%@demo.gymtrack.pe'),
    (select count(*) from public.pagos pa join auth.users u on u.id = pa.cliente_id where u.email like '%@demo.gymtrack.pe'),
    (select count(*) from public.asistencias a join auth.users u on u.id = a.cliente_id where u.email like '%@demo.gymtrack.pe');
end $$;

-- Resumen
select p.role, count(*) as cuentas
from public.profiles p join auth.users u on u.id = p.id
where u.email like '%@demo.gymtrack.pe'
group by p.role order by 1;

-- ---------------------------- fin del paso 1 ----------------------------


-- ---------------------------------------------------------------------
-- LIMPIEZA · Borra SOLO los datos de demostración (ejecutar por separado)
-- ---------------------------------------------------------------------
-- do $$
-- declare demo uuid[];
-- begin
--   select array_agg(id) into demo from auth.users where email like '%@demo.gymtrack.pe';
--   if demo is null then raise notice 'No hay datos de demostración.'; return; end if;
--   delete from public.solicitudes_pago where cliente_id = any(demo);
--   delete from public.rutinas where cliente_id = any(demo) or profesional_id = any(demo);
--   delete from public.mediciones where cliente_id = any(demo) or registrado_por = any(demo);
--   delete from public.asistencias where cliente_id = any(demo);
--   delete from public.pagos where cliente_id = any(demo);
--   delete from public.membresias where cliente_id = any(demo);
--   delete from public.profesional_clientes where cliente_id = any(demo) or profesional_id = any(demo);
--   delete from public.avisos where publicado_por = any(demo);
--   delete from public.historial_operaciones where actor_id = any(demo);
--   delete from auth.users where id = any(demo);
--   delete from public.notificaciones where usuario_id = any(demo);
--   raise notice 'Datos de demostración eliminados.';
-- end $$;
