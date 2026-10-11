-- 0017: el profesional puede ver la membresía y las visitas de SUS clientes
-- (los vinculados en profesional_clientes). Solo lectura, aditivo.

create or replace function public.gt_es_mi_cliente(p_cliente uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profesional_clientes pc
    where pc.profesional_id = auth.uid() and pc.cliente_id = p_cliente
  )
$$;

drop policy if exists gt_membresias_prof_select on public.membresias;
create policy gt_membresias_prof_select on public.membresias
  for select to authenticated
  using (public.gt_mi_rol() = 'profesional' and public.gt_es_mi_cliente(cliente_id));

drop policy if exists gt_asistencias_prof_select on public.asistencias;
create policy gt_asistencias_prof_select on public.asistencias
  for select to authenticated
  using (public.gt_mi_rol() = 'profesional' and public.gt_es_mi_cliente(cliente_id));