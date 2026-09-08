-- Sedes reales de Cascada Gym (Comas). Nombres cortos para que se vean
-- bien en selects/dropdowns de la UI, especialmente en móvil.
-- La dirección completa queda en el campo "direccion".
insert into sedes (nombre, direccion, activa)
select 'Sede 1 - Jamaica/Parque', 'Av. Túpac Amaru 4240 (Km 13.5), Comas', true
where not exists (
  select 1 from sedes where nombre = 'Sede 1 - Jamaica/Parque'
);

insert into sedes (nombre, direccion, activa)
select 'Sede 2 - Banco de la Nación', 'Av. Túpac Amaru 1857 (Km 12.5), Comas', true
where not exists (
  select 1 from sedes where nombre = 'Sede 2 - Banco de la Nación'
);

insert into sedes (nombre, direccion, activa)
select 'Sede Velasco', 'Av. Túpac Amaru, Km 13.5, Comas', true
where not exists (
  select 1 from sedes where nombre = 'Sede Velasco'
);