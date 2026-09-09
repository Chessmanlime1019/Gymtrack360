-- Solo staff autorizado puede subir comprobantes
create policy "comprobantes_insert_staff"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'comprobantes'
  and auth_role() in ('recepcionista', 'admin_sede', 'super_admin')
);

-- Cualquiera autenticado puede ver los comprobantes (son públicos dentro de la app)
create policy "comprobantes_select_autenticados"
on storage.objects for select to authenticated
using (bucket_id = 'comprobantes');