-- 0022: Mi progreso. Mediciones corporales (peso y medidas) del cliente.
-- El cliente registra las suyas; su profesional (el que lo tiene a cargo) puede
-- verlas y también registrar mediciones. Recepción/Admin de la sede solo leen.

create table if not exists public.mediciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles(id) on delete cascade,
  fecha date not null default ((now() at time zone 'America/Lima')::date),
  peso_kg numeric(5,2) check (peso_kg between 20 and 400),
  grasa_pct numeric(4,1) check (grasa_pct between 1 and 80),
  cintura_cm numeric(5,1) check (cintura_cm between 20 and 300),
  pecho_cm numeric(5,1) check (pecho_cm between 20 and 300),
  cadera_cm numeric(5,1) check (cadera_cm between 20 and 300),
  brazo_cm numeric(5,1) check (brazo_cm between 10 and 150),
  pierna_cm numeric(5,1) check (pierna_cm between 20 and 200),
  nota text check (nota is null or char_length(nota) <= 300),
  registrado_por uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint mediciones_algun_valor check (
    peso_kg is not null or grasa_pct is not null or cintura_cm is not null
    or pecho_cm is not null or cadera_cm is not null or brazo_cm is not null
    or pierna_cm is not null
  )
);

create index if not exists mediciones_cliente_fecha_idx
  on public.mediciones (cliente_id, fecha desc);

alter table public.mediciones enable row level security;

-- Lectura
drop policy if exists gt_mediciones_select on public.mediciones;
create policy gt_mediciones_select on public.mediciones
  for select to authenticated
  using (
    cliente_id = auth.uid()
    or public.gt_mi_rol() = 'super_admin'
    or (public.gt_mi_rol() = 'profesional' and public.gt_es_mi_cliente(cliente_id))
    or (public.gt_mi_rol() in ('admin_sede', 'recepcionista')
        and public.gt_cliente_en_mi_sede(cliente_id))
  );

-- Alta: el cliente en lo suyo, o el profesional en sus clientes.
drop policy if exists gt_mediciones_insert on public.mediciones;
create policy gt_mediciones_insert on public.mediciones
  for insert to authenticated
  with check (
    registrado_por = auth.uid()
    and (
      (cliente_id = auth.uid() and public.gt_mi_rol() = 'cliente')
      or (public.gt_mi_rol() = 'profesional' and public.gt_es_mi_cliente(cliente_id))
    )
  );

-- Baja: cada quien borra solo lo que registró (por si se equivocó).
drop policy if exists gt_mediciones_delete on public.mediciones;
create policy gt_mediciones_delete on public.mediciones
  for delete to authenticated
  using (registrado_por = auth.uid());