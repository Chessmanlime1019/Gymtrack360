-- 0020: genera el QR del cliente automáticamente

create or replace function public.gt_asignar_qr()
returns trigger
language plpgsql
as $$
begin
  if NEW.role::text = 'cliente'
     and (NEW.qr_code is null or btrim(NEW.qr_code) = '') then
    NEW.qr_code := 'GT360-' || NEW.id::text;
  end if;
  return NEW;
end;
$$;

drop trigger if exists gt_asignar_qr on public.profiles;
create trigger gt_asignar_qr
  before insert or update on public.profiles
  for each row execute function public.gt_asignar_qr();

-- Rellena a los clientes que ya existen sin QR
update public.profiles
   set qr_code = 'GT360-' || id::text
 where role::text = 'cliente'
   and (qr_code is null or btrim(qr_code) = '');