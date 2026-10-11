-- 0015: nadie puede cambiarse a sí mismo el rol, la sede, el QR ni el estado activo
-- (solo el super admin). No depende de las políticas RLS existentes.
-- Edge Functions (service_role) y cambios hechos por otro usuario autorizado no se afectan.

create or replace function public.gt_proteger_perfil_propio() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and auth.uid() = OLD.id
     and coalesce((select role::text from public.profiles where id = auth.uid()), '') <> 'super_admin'
     and (
       NEW.role is distinct from OLD.role
       or NEW.sede_id is distinct from OLD.sede_id
       or NEW.qr_code is distinct from OLD.qr_code
       or NEW.activo is distinct from OLD.activo
     )
  then
    raise exception 'No puedes modificar tu rol, sede, QR o estado desde tu propio perfil';
  end if;
  return NEW;
end;
$$;

drop trigger if exists gt_proteger_perfil_propio on public.profiles;
create trigger gt_proteger_perfil_propio
  before update on public.profiles
  for each row execute function public.gt_proteger_perfil_propio();