-- 0018: el profesional puede dejar de atender a un cliente (borra solo el vínculo,
-- no toca las rutinas ya creadas).
drop policy if exists gt_prof_clientes_delete on public.profesional_clientes;
create policy gt_prof_clientes_delete on public.profesional_clientes
  for delete to authenticated
  using (profesional_id = auth.uid() and public.gt_mi_rol() = 'profesional');