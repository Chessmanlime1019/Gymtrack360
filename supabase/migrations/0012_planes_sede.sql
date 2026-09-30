-- 0012_planes_sede.sql
-- Permite que un plan pertenezca a una sede especifica, o a ninguna
-- (sede_id = null significa "disponible para todas las sedes", que es
-- como se comportaban TODOS los planes antes de esta migracion -- por
-- eso no hace falta rellenar nada: los planes existentes quedan tal
-- cual, como planes globales).

alter table public.planes
  add column if not exists sede_id uuid references public.sedes(id);

comment on column public.planes.sede_id is
  'NULL = plan disponible para todas las sedes. Con valor = plan exclusivo de esa sede.';

create index if not exists planes_sede_id_idx on public.planes (sede_id);