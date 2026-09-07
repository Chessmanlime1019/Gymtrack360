-- Permite que visitantes NO autenticados (rol anon) vean las sedes activas.
-- Necesario para el formulario de registro, donde el usuario aún no tiene sesión.
create policy "sedes_select_publico"
on sedes for select
to anon
using (activa = true);