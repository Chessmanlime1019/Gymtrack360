-- 0029: cada sede tiene como máximo un Admin de Sede activo y una Recepción activa.
-- Profesionales y clientes no tienen límite.
--
-- · La regla vive en la base de datos: ninguna pantalla ni llamada directa puede
--   saltársela al crear, editar, mover de sede o reactivar un usuario.
-- · Si ya hay duplicados, se deja activa una cuenta por sede y rol y las demás se
--   desactivan (no se borra nada). Se prefieren las cuentas que no son de
--   demostración y, entre ellas, la más antigua.
-- · La consulta final muestra cómo quedó cada sede.

with ranking as (
  select p.id,
         row_number() over (
           partition by p.sede_id, p.role
           order by coalesce(u.email like '%@demo.gymtrack.pe', false), p.created_at, p.id
         ) as orden
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.activo
    and p.sede_id is not null
    and p.role in ('admin_sede', 'recepcionista')
)
update public.profiles p
set activo = false
from ranking r
where r.id = p.id and r.orden > 1;

create unique index if not exists profiles_un_admin_o_recepcion_activo
  on public.profiles (sede_id, role)
  where activo and role in ('admin_sede', 'recepcionista');

select s.nombre as sede, p.role as rol, u.email, p.nombre, p.apellido,
       case when p.activo then 'Activo' else 'Desactivado' end as estado
from public.profiles p
join public.sedes s on s.id = p.sede_id
left join auth.users u on u.id = p.id
where p.role in ('admin_sede', 'recepcionista')
order by s.nombre, p.role, p.activo desc, u.email;
