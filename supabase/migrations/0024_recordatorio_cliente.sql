-- 0024: el profesional puede enviar un recordatorio a UNO DE SUS clientes
-- (sin venir / membresía por vencer). Aditivo. Máximo 1 recordatorio del mismo
-- tipo por cliente cada 24 horas, para no hacer spam.

create or replace function public.prof_recordar_cliente(p_cliente uuid, p_motivo text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_titulo  text;
  v_mensaje text;
  v_ruta    text;
  v_prof    text := coalesce(public.gt_nombre(auth.uid()), 'Tu entrenador');
begin
  if public.gt_mi_rol() <> 'profesional' then
    raise exception 'Solo un profesional puede enviar recordatorios.';
  end if;
  if not public.gt_es_mi_cliente(p_cliente) then
    raise exception 'Este cliente no está en tu lista.';
  end if;

  if p_motivo = 'sin_venir' then
    v_titulo  := 'Te extrañamos en el gimnasio';
    v_mensaje := v_prof || ' te recuerda retomar tu rutina. ¡Te esperamos!';
    v_ruta    := '/cliente/visitas';
  elsif p_motivo = 'por_vencer' then
    v_titulo  := 'Tu membresía está por vencer';
    v_mensaje := v_prof || ' te recuerda renovar tu plan para no perder tu progreso.';
    v_ruta    := '/cliente/mi-membresia';
  else
    raise exception 'Motivo no válido.';
  end if;

  if exists (
    select 1 from public.notificaciones
    where usuario_id = p_cliente and titulo = v_titulo
      and created_at > now() - interval '24 hours'
  ) then
    return 'repetido';
  end if;

  perform public.gt_notificar(p_cliente, 'warning', v_titulo, v_mensaje, v_ruta);
  return 'enviado';
end;
$$;

revoke all on function public.prof_recordar_cliente(uuid, text) from public, anon;
grant execute on function public.prof_recordar_cliente(uuid, text) to authenticated;