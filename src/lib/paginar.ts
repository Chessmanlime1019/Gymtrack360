// Supabase devuelve como máximo 1000 filas por consulta y corta el resto sin
// avisar. Para reportes y totales hay que pedir todas, página por página.

const TAM_PAGINA = 1000;

// "consulta" debe crear la consulta de nuevo cada vez y tener un orden estable
// (terminar en .order("id")), o entre páginas se repetirían o saltarían filas.
export async function traerTodas<T>(consulta: () => any): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += TAM_PAGINA) {
    const { data, error } = await consulta().range(desde, desde + TAM_PAGINA - 1);
    if (error) throw error;
    filas.push(...((data ?? []) as T[]));
    if (!data || data.length < TAM_PAGINA) return filas;
  }
}

// Filtra por una lista larga de ids en lotes: un .in() enorme no cabe en la URL.
export async function traerPorIds<T>(ids: string[], consulta: (lote: string[]) => any, tamLote = 150): Promise<T[]> {
  const filas: T[] = [];
  for (let i = 0; i < ids.length; i += tamLote) {
    const { data, error } = await consulta(ids.slice(i, i + tamLote));
    if (error) throw error;
    filas.push(...((data ?? []) as T[]));
  }
  return filas;
}

// El estado guardado sigue en "activa" aunque la fecha ya haya pasado.
export function estadoEfectivo<E extends string>(estado: E, fechaFin: string, hoy: string): E | "vencida" {
  return estado === "activa" && fechaFin.slice(0, 10) < hoy ? "vencida" : estado;
}
