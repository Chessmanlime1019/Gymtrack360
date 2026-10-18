-- 0023: Avisos del gimnasio.
-- Admin de Sede y Recepción publican avisos para su sede; Super Admin también
-- para todas las sedes. Clientes y profesionales los leen. Al publicar, se
-- notifica a los clientes y profesionales del alcance (usa la tabla de 0019).

create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid references public.sedes(id) on delete cascade, -- null = todas las sedes
  titulo text not null check (char_length(btrim(titulo)) between 3 and 120),
  mensaje text not null check (char_length(btrim(mensaje)) between 1 and 1000),
  tipo text not null default 'info' check (tipo in ('info', 'importante', 'promo')),
  fijado boolean not null default false,
  activo boolean not null default true,
  vence_en date,
  publicado_por uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists avisos_sede_idx on public.avisos (sede_id, created_at desc);

alter table public.avisos enable row level security;

-- Todos leen los avisos activos y vigentes de su sede (o de todas las sedes).
drop policy if exists gt_avisos_select_vigentes on public.avisos;
create policy gt_avisos_select_vigentes on public.avisos
  for select to authenticated
  using (
    activo
    and (vence_en is null or vence_en >= ((now() at time zone 'America/Lima')::date))
    and (sede_id is null or sede_id = public.gt_mi_sede())
  );

-- El staff ve (también ocultos y vencidos) y gestiona los de su sede.
drop policy if exists gt_avisos_select_staff on public.avisos;
create policy gt_avisos_select_staff on public.avisos
  for select to authenticated
  using (
    public.gt_mi_rol() = 'super_admin'
    or (public.gt_mi_rol() in ('admin_sede', 'recepcionista')
        and sede_id is not null and sede_id = public.gt_mi_sede())
  );

drop policy if exists gt_avisos_insert on public.avisos;
create policy gt_avisos_insert on public.avisos
  for insert to authenticated
  with check (
    publicado_por = auth.uid()
    and (
      public.gt_mi_rol() = 'super_admin'
      or (public.gt_mi_rol() in ('admin_sede', 'recepcionista')
          and sede_id is not null and sede_id = public.gt_mi_sede())
    )
  );

drop policy if exists gt_avisos_update on public.avisos;
create policy gt_avisos_update on public.avisos
  for update to authenticated
  using (
    public.gt_mi_rol() = 'super_admin'
    or (public.gt_mi_rol() in ('admin_sede', 'recepcionista')
        and sede_id is not null and sede_id = public.gt_mi_sede())
  )
  with check (
    public.gt_mi_rol() = 'super_admin'
    or (public.gt_mi_rol() in ('admin_sede', 'recepcionista')
        and sede_id is not null and sede_id = public.gt_mi_sede())
  );

drop policy if exists gt_avisos_delete on public.avisos;
create policy gt_avisos_delete on public.avisos
  for delete to authenticated
  using (
    public.gt_mi_rol() = 'super_admin'
    or (public.gt_mi_rol() in ('admin_sede', 'recepcionista')
        and sede_id is not null and sede_id = public.gt_mi_sede())
  );

-- Al publicar un aviso activo: notificación a clientes y profesionales del alcance.
-- Nunca rompe la publicación: si algo falla al notificar, se ignora.
create or replace function public.gt_trg_avisos_notif() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_tipo text := case NEW.tipo when 'importante' then 'warning' when 'promo' then 'success' else 'info' end;
begin
  if not NEW.activo then
    return NEW;
  end if;

  for r in
    select id, role::text as rol
    from public.profiles
    where role::text in ('cliente', 'profesional')
      and coalesce(activo, true)
      and (NEW.sede_id is null or sede_id = NEW.sede_id)
  loop
    perform public.gt_notificar(
      r.id, v_tipo, 'Aviso: ' || NEW.titulo, left(NEW.mensaje, 140),
      case r.rol when 'cliente' then '/cliente/avisos' else '/profesional/avisos' end
    );
  end loop;

  return NEW;
exception when others then
  return NEW;
end;
$$;

drop trigger if exists gt_avisos_notif on public.avisos;
create trigger gt_avisos_notif
  after insert on public.avisos
  for each row execute function public.gt_trg_avisos_notif();