-- 0019: notificaciones reales. Cada acción que afecta a una persona (cambio de
-- datos, membresía, pago, rutina, vínculo con profesional, ingreso) genera una
-- notificación para ella, y para sus profesionales cuando corresponde.
-- Los triggers NUNCA rompen la operación original: si algo falla al notificar, se ignora.

create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null default 'info' check (tipo in ('info', 'success', 'warning', 'danger')),
  titulo text not null,
  mensaje text,
  ruta text,
  leida boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notificaciones_usuario_idx
  on public.notificaciones (usuario_id, created_at desc);

alter table public.notificaciones enable row level security;

drop policy if exists notif_select_propias on public.notificaciones;
create policy notif_select_propias on public.notificaciones
  for select to authenticated using (usuario_id = auth.uid());

drop policy if exists notif_update_propias on public.notificaciones;
create policy notif_update_propias on public.notificaciones
  for update to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists notif_delete_propias on public.notificaciones;
create policy notif_delete_propias on public.notificaciones
  for delete to authenticated using (usuario_id = auth.uid());

-- Los usuarios solo pueden marcar como leída; nunca crear ni editar el contenido.
revoke insert, update on public.notificaciones from anon, authenticated;
grant update (leida) on public.notificaciones to authenticated;

-- Tiempo real (si ya estaba agregada, no pasa nada)
do $$
begin
  alter publication supabase_realtime add table public.notificaciones;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------- utilidades
create or replace function public.gt_nombre(p_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select nullif(trim(coalesce(nombre, '') || ' ' || coalesce(apellido, '')), '') from public.profiles where id = p_id
$$;

-- No se notifica a quien hizo la acción sobre sí mismo.
create or replace function public.gt_notificar(
  p_usuario uuid, p_tipo text, p_titulo text, p_mensaje text, p_ruta text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_usuario is null or p_usuario is not distinct from auth.uid() then
    return;
  end if;
  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, ruta)
  values (p_usuario, p_tipo, p_titulo, p_mensaje, p_ruta);
exception when others then
  null;
end;
$$;

create or replace function public.gt_notificar_profesionales(
  p_cliente uuid, p_tipo text, p_titulo text, p_mensaje text, p_ruta text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select profesional_id from public.profesional_clientes where cliente_id = p_cliente loop
    perform public.gt_notificar(r.profesional_id, p_tipo, p_titulo, p_mensaje, p_ruta);
  end loop;
exception when others then
  null;
end;
$$;

-- ---------------------------------------------------------------- profiles
create or replace function public.gt_trg_profiles_notif() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor text := coalesce(public.gt_nombre(auth.uid()), 'Administración');
  v_cambios text[] := '{}';
  v_ruta text := case when NEW.role::text = 'cliente' then '/cliente/mi-perfil' else null end;
begin
  if TG_OP = 'INSERT' then
    perform public.gt_notificar(NEW.id, 'success', '¡Bienvenido a GYMTRACK 360!',
      'Tu cuenta está lista. Revisa tu perfil y tu membresía.', v_ruta);
    return NEW;
  end if;

  if NEW.nombre is distinct from OLD.nombre then v_cambios := v_cambios || 'nombre'; end if;
  if NEW.apellido is distinct from OLD.apellido then v_cambios := v_cambios || 'apellido'; end if;
  if NEW.sede_id is distinct from OLD.sede_id then v_cambios := v_cambios || 'sede'; end if;

  if array_length(v_cambios, 1) > 0 then
    perform public.gt_notificar(NEW.id, 'info', 'Tus datos fueron actualizados',
      v_actor || ' actualizó tu ' || array_to_string(v_cambios, ', ') ||
      '. Ahora figuras como ' || coalesce(NEW.nombre, '') || ' ' || coalesce(NEW.apellido, '') || '.', v_ruta);

    if NEW.role::text = 'cliente' then
      perform public.gt_notificar_profesionales(NEW.id, 'info', 'Datos de cliente actualizados',
        v_actor || ' actualizó ' || array_to_string(v_cambios, ', ') || ' de ' ||
        coalesce(NEW.nombre, '') || ' ' || coalesce(NEW.apellido, '') || '.', '/profesional/mis-clientes');
    end if;
  end if;

  if NEW.activo is distinct from OLD.activo then
    perform public.gt_notificar(NEW.id,
      case when NEW.activo then 'success' else 'danger' end,
      case when NEW.activo then 'Tu cuenta fue activada' else 'Tu cuenta fue desactivada' end,
      v_actor || case when NEW.activo then ' reactivó tu acceso.' else ' desactivó tu acceso. Contacta a recepción.' end,
      v_ruta);
  end if;

  if NEW.role is distinct from OLD.role then
    perform public.gt_notificar(NEW.id, 'warning', 'Tu rol fue actualizado',
      v_actor || ' cambió tu rol a ' || NEW.role::text || '.', null);
  end if;

  return NEW;
exception when others then
  return NEW;
end;
$$;

drop trigger if exists gt_notif_profiles on public.profiles;
create trigger gt_notif_profiles
  after insert or update on public.profiles
  for each row execute function public.gt_trg_profiles_notif();

-- -------------------------------------------------------------- membresías
create or replace function public.gt_trg_membresias_notif() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_plan text;
  v_cliente text;
begin
  select nombre into v_plan from public.planes where id = NEW.plan_id;
  v_cliente := coalesce(public.gt_nombre(NEW.cliente_id), 'Un cliente');

  if TG_OP = 'INSERT' then
    perform public.gt_notificar(NEW.cliente_id, 'success', 'Membresía activada',
      'Plan ' || coalesce(v_plan, '') || ', vigente del ' || to_char(NEW.fecha_inicio, 'DD/MM/YYYY') ||
      ' al ' || to_char(NEW.fecha_fin, 'DD/MM/YYYY') || '.', '/cliente/mi-membresia');
    perform public.gt_notificar_profesionales(NEW.cliente_id, 'info', 'Nueva membresía de un cliente',
      v_cliente || ' tiene el plan ' || coalesce(v_plan, '') || ' hasta el ' || to_char(NEW.fecha_fin, 'DD/MM/YYYY') || '.',
      '/profesional/mis-clientes');
  elsif NEW.estado::text = 'cancelada' and OLD.estado::text is distinct from 'cancelada' then
    perform public.gt_notificar(NEW.cliente_id, 'danger', 'Tu membresía fue cancelada',
      'Tu plan ' || coalesce(v_plan, '') || ' fue cancelado. Contacta a recepción si fue un error.', '/cliente/mi-membresia');
    perform public.gt_notificar_profesionales(NEW.cliente_id, 'warning', 'Membresía cancelada',
      'La membresía de ' || v_cliente || ' fue cancelada.', '/profesional/mis-clientes');
  end if;

  return NEW;
exception when others then
  return NEW;
end;
$$;

drop trigger if exists gt_notif_membresias on public.membresias;
create trigger gt_notif_membresias
  after insert or update on public.membresias
  for each row execute function public.gt_trg_membresias_notif();

-- ------------------------------------------------------------------ pagos
create or replace function public.gt_trg_pagos_notif() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.gt_notificar(NEW.cliente_id, 'success', 'Pago registrado',
    'Se registró tu pago de S/ ' || to_char(NEW.monto, 'FM999990.00') || ' (' || NEW.metodo_pago::text || ').',
    '/cliente/mi-membresia');
  return NEW;
exception when others then
  return NEW;
end;
$$;

drop trigger if exists gt_notif_pagos on public.pagos;
create trigger gt_notif_pagos
  after insert on public.pagos
  for each row execute function public.gt_trg_pagos_notif();

-- ---------------------------------------------------------------- rutinas
create or replace function public.gt_trg_rutinas_notif() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_prof text;
begin
  if TG_OP = 'DELETE' then
    perform public.gt_notificar(OLD.cliente_id, 'warning', 'Rutina eliminada',
      'Tu profesional eliminó la rutina “' || OLD.nombre || '”.', '/cliente/rutinas');
    return OLD;
  end if;

  v_prof := coalesce(public.gt_nombre(NEW.profesional_id), 'Tu profesional');

  if TG_OP = 'INSERT' then
    if NEW.activa then
      perform public.gt_notificar(NEW.cliente_id, 'success', 'Tienes una rutina nueva',
        v_prof || ' te asignó “' || NEW.nombre || '”.', '/cliente/rutinas');
    end if;
  elsif NEW.activa is distinct from OLD.activa then
    perform public.gt_notificar(NEW.cliente_id,
      case when NEW.activa then 'success' else 'info' end,
      case when NEW.activa then 'Rutina activada' else 'Rutina desactivada' end,
      v_prof || case when NEW.activa then ' activó' else ' desactivó' end || ' tu rutina “' || NEW.nombre || '”.',
      '/cliente/rutinas');
  elsif NEW.activa then
    perform public.gt_notificar(NEW.cliente_id, 'info', 'Tu rutina fue actualizada',
      v_prof || ' actualizó “' || NEW.nombre || '”. Revisa los cambios.', '/cliente/rutinas');
  end if;

  return NEW;
exception when others then
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists gt_notif_rutinas on public.rutinas;
create trigger gt_notif_rutinas
  after insert or update or delete on public.rutinas
  for each row execute function public.gt_trg_rutinas_notif();

-- ------------------------------------------------------ vínculo profesional
create or replace function public.gt_trg_prof_clientes_notif() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    perform public.gt_notificar(NEW.cliente_id, 'info', 'Tienes un profesional asignado',
      coalesce(public.gt_nombre(NEW.profesional_id), 'Un profesional') || ' será tu profesional.', '/cliente/rutinas');
    return NEW;
  end if;

  perform public.gt_notificar(OLD.cliente_id, 'info', 'Cambio de profesional',
    coalesce(public.gt_nombre(OLD.profesional_id), 'Tu profesional') || ' ya no te atiende.', '/cliente/rutinas');
  return OLD;
exception when others then
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists gt_notif_prof_clientes on public.profesional_clientes;
create trigger gt_notif_prof_clientes
  after insert or delete on public.profesional_clientes
  for each row execute function public.gt_trg_prof_clientes_notif();

-- ------------------------------------------------------------- asistencias
create or replace function public.gt_trg_asistencias_notif() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_sede text;
begin
  select nombre into v_sede from public.sedes where id = NEW.sede_id;
  perform public.gt_notificar(NEW.cliente_id, 'success', 'Ingreso registrado',
    'Entraste a ' || coalesce(v_sede, 'tu sede') || ' a las ' ||
    to_char(NEW.fecha_hora at time zone 'America/Lima', 'HH24:MI') || '.', '/cliente/mi-perfil');
  return NEW;
exception when others then
  return NEW;
end;
$$;

drop trigger if exists gt_notif_asistencias on public.asistencias;
create trigger gt_notif_asistencias
  after insert on public.asistencias
  for each row execute function public.gt_trg_asistencias_notif();