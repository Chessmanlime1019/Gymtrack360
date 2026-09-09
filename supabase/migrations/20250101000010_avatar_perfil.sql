-- ============================================
-- GYMTRACK 360 - Foto de perfil (avatar)
-- ============================================

alter table profiles add column if not exists avatar_url text;

-- El bucket "avatars" se crea aparte en el Dashboard (Storage > New bucket,
-- marcado como público), igual que hicimos con "comprobantes".
-- Convención de path: {user_id}/profile.{ext} — así cada quien solo
-- puede escribir dentro de su propia carpeta.

create policy "avatars_insert_propio"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_update_propio"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_delete_propio"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_select_autenticados"
on storage.objects for select to authenticated
using (bucket_id = 'avatars');