-- 0014: Rutinas completas (días, descanso, objetivo, nivel) + permisos.
-- Es aditivo: no borra ni cambia políticas existentes.

-- ---------- Columnas nuevas ----------
alter table public.rutinas
  add column if not exists objetivo text,
  add column if not exists nivel text,
  add column if not exists semanas integer;

alter table public.rutina_ejercicios
  add column if not exists dia smallint not null default 1,
  add column if not exists descanso_seg integer not null default 60,
  add column if not exists peso_sugerido text;

alter table public.ejercicios
  add column if not exists equipo text;

-- ---------- Funciones auxiliares (security definer: evitan recursión de RLS) ----------
create or replace function public.gt_mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select role::text from public.profiles where id = auth.uid()
$$;

create or replace function public.gt_mi_sede() returns uuid
language sql stable security definer set search_path = public as $$
  select sede_id from public.profiles where id = auth.uid()
$$;

create or replace function public.gt_cliente_en_mi_sede(p_cliente uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles c
    where c.id = p_cliente and c.role::text = 'cliente'
      and c.sede_id is not distinct from (select sede_id from public.profiles where id = auth.uid())
  )
$$;

-- ---------- Políticas ----------
-- rutinas
drop policy if exists gt_rutinas_profesional on public.rutinas;
create policy gt_rutinas_profesional on public.rutinas
  for all to authenticated
  using (profesional_id = auth.uid() and public.gt_mi_rol() = 'profesional')
  with check (
    profesional_id = auth.uid() and public.gt_mi_rol() = 'profesional'
    and public.gt_cliente_en_mi_sede(cliente_id)
  );

drop policy if exists gt_rutinas_cliente_select on public.rutinas;
create policy gt_rutinas_cliente_select on public.rutinas
  for select to authenticated
  using (cliente_id = auth.uid());

drop policy if exists gt_rutinas_admin_select on public.rutinas;
create policy gt_rutinas_admin_select on public.rutinas
  for select to authenticated
  using (
    public.gt_mi_rol() = 'super_admin'
    or (public.gt_mi_rol() = 'admin_sede' and public.gt_cliente_en_mi_sede(cliente_id))
  );

-- rutina_ejercicios
drop policy if exists gt_rutina_ej_profesional on public.rutina_ejercicios;
create policy gt_rutina_ej_profesional on public.rutina_ejercicios
  for all to authenticated
  using (exists (select 1 from public.rutinas r where r.id = rutina_id and r.profesional_id = auth.uid()))
  with check (exists (select 1 from public.rutinas r where r.id = rutina_id and r.profesional_id = auth.uid()));

drop policy if exists gt_rutina_ej_cliente_select on public.rutina_ejercicios;
create policy gt_rutina_ej_cliente_select on public.rutina_ejercicios
  for select to authenticated
  using (exists (select 1 from public.rutinas r where r.id = rutina_id and r.cliente_id = auth.uid()));

-- ejercicios (catálogo)
drop policy if exists gt_ejercicios_select on public.ejercicios;
create policy gt_ejercicios_select on public.ejercicios
  for select to authenticated using (true);

drop policy if exists gt_ejercicios_insert on public.ejercicios;
create policy gt_ejercicios_insert on public.ejercicios
  for insert to authenticated
  with check (public.gt_mi_rol() in ('profesional', 'admin_sede', 'super_admin'));

-- profesional_clientes
drop policy if exists gt_prof_clientes_select on public.profesional_clientes;
create policy gt_prof_clientes_select on public.profesional_clientes
  for select to authenticated using (profesional_id = auth.uid());

drop policy if exists gt_prof_clientes_insert on public.profesional_clientes;
create policy gt_prof_clientes_insert on public.profesional_clientes
  for insert to authenticated
  with check (
    profesional_id = auth.uid() and public.gt_mi_rol() = 'profesional'
    and public.gt_cliente_en_mi_sede(cliente_id)
  );

-- profiles: el profesional ve a los clientes de su sede; el cliente ve a los profesionales de su sede
drop policy if exists gt_profiles_prof_ve_clientes on public.profiles;
create policy gt_profiles_prof_ve_clientes on public.profiles
  for select to authenticated
  using (
    public.gt_mi_rol() = 'profesional' and role::text = 'cliente'
    and sede_id is not distinct from public.gt_mi_sede()
  );

drop policy if exists gt_profiles_cliente_ve_prof on public.profiles;
create policy gt_profiles_cliente_ve_prof on public.profiles
  for select to authenticated
  using (
    public.gt_mi_rol() = 'cliente' and role::text = 'profesional'
    and sede_id is not distinct from public.gt_mi_sede()
  );

-- ---------- Catálogo base de ejercicios (solo los que falten) ----------
insert into public.ejercicios (nombre, grupo_muscular, equipo)
select v.nombre, v.grupo, v.equipo
from (values
  ('Press de banca con barra','Pecho','Barra'),
  ('Press inclinado con mancuernas','Pecho','Mancuernas'),
  ('Aperturas con mancuernas','Pecho','Mancuernas'),
  ('Fondos en paralelas','Pecho','Peso corporal'),
  ('Flexiones','Pecho','Peso corporal'),
  ('Dominadas','Espalda','Peso corporal'),
  ('Remo con barra','Espalda','Barra'),
  ('Jalón al pecho','Espalda','Polea'),
  ('Remo en polea baja','Espalda','Polea'),
  ('Peso muerto','Espalda','Barra'),
  ('Press militar','Hombros','Barra'),
  ('Elevaciones laterales','Hombros','Mancuernas'),
  ('Pájaros','Hombros','Mancuernas'),
  ('Curl de bíceps con barra','Bíceps','Barra'),
  ('Curl martillo','Bíceps','Mancuernas'),
  ('Extensión de tríceps en polea','Tríceps','Polea'),
  ('Press francés','Tríceps','Barra Z'),
  ('Sentadilla con barra','Piernas','Barra'),
  ('Prensa de piernas','Piernas','Máquina'),
  ('Zancadas','Piernas','Mancuernas'),
  ('Extensión de cuádriceps','Piernas','Máquina'),
  ('Curl femoral','Piernas','Máquina'),
  ('Peso muerto rumano','Piernas','Barra'),
  ('Hip thrust','Glúteos','Barra'),
  ('Patada de glúteo en polea','Glúteos','Polea'),
  ('Elevación de talones','Pantorrillas','Máquina'),
  ('Plancha abdominal','Core','Peso corporal'),
  ('Crunch abdominal','Core','Peso corporal'),
  ('Elevación de piernas','Core','Peso corporal'),
  ('Trote en cinta','Cardio','Cinta'),
  ('Bicicleta estática','Cardio','Bicicleta'),
  ('Remo en máquina (cardio)','Cardio','Máquina')
) as v(nombre, grupo, equipo)
where not exists (select 1 from public.ejercicios e where lower(e.nombre) = lower(v.nombre));
