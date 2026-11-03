-- 0027: la base de datos trabaja en hora de Lima.
--
-- Supabase usa UTC por defecto, así que current_date, now()::date y
-- date_trunc('day', now()) cambiaban de día a las 7 p. m. de Lima. Efectos que
-- corrige: validar_acceso_qr rechazaba de noche una membresía que vence hoy, y
-- los conteos "de hoy" del servidor empezaban a las 7 p. m. del día anterior.
--
-- Solo afecta a las conexiones nuevas. Si tras ejecutarlo algo sigue en UTC,
-- reinicia el proyecto (Settings > General > Restart project).

alter database postgres set timezone to 'America/Lima';
