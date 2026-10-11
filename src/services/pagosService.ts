import { supabase } from "@/lib/supabaseClient";
import type { MetodoPago } from "@/schemas/pagoSchemas";

export interface PagoReciente {
  id: string;
  monto: number;
  metodo_pago: string;
  fecha: string;
}

export interface PagoConDetalle {
  id: string;
  cliente_id: string;
  clienteNombre: string;
  sede_id: string;
  sedeNombre: string;
  membresia_id: string | null;
  monto: number;
  metodo_pago: string;
  fecha: string;
}

interface PagoRow {
  id: string;
  cliente_id: string;
  sede_id: string;
  membresia_id: string | null;
  monto: number;
  metodo_pago: string;
  fecha: string;
}

interface ClienteMiniNombre {
  id: string;
  nombre: string;
  apellido: string;
}
interface SedeMini {
  id: string;
  nombre: string;
}

export async function registrarPago(params: {
  pagoId?: string;
  clienteId: string;
  membresiaId?: string;
  sedeId?: string;
  monto: number;
  metodoPago: MetodoPago | string;
  comprobanteUrl?: string;
}) {
  const { error } = await (supabase.from("pagos") as any).insert({
    ...(params.pagoId ? { id: params.pagoId } : {}),
    cliente_id: params.clienteId,
    membresia_id: params.membresiaId,
    sede_id: params.sedeId,
    monto: params.monto,
    metodo_pago: params.metodoPago,
    comprobante_url: params.comprobanteUrl,
  });

  if (error) throw error;
}

export async function obtenerPagosRecientesCliente(
  clienteId: string,
  limite = 3
): Promise<PagoReciente[]> {
  const { data, error } = await supabase
    .from("pagos")
    .select("id, monto, metodo_pago, fecha")
    .eq("cliente_id", clienteId)
    .order("fecha", { ascending: false })
    .limit(limite)
    .returns<PagoReciente[]>();

  if (error) throw error;
  return data ?? [];
}

// Historial completo, filtrado por sede y con el nombre del cliente y de
// la sede ya resueltos (antes esta función no filtraba nada y devolvía
// las filas crudas sin nombres -- lo usa tanto Reportes como el nuevo
// historial de Registrar Pago).
export async function obtenerPagos(sedeId: string | null): Promise<PagoConDetalle[]> {
  let query = supabase
    .from("pagos")
    .select("id, cliente_id, sede_id, membresia_id, monto, metodo_pago, fecha")
    .order("fecha", { ascending: false });

  if (sedeId) {
    query = query.eq("sede_id", sedeId);
  }

  const { data, error } = await query.returns<PagoRow[]>();
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const clienteIds = [...new Set(data.map((p) => p.cliente_id))];
  const sedeIds = [...new Set(data.map((p) => p.sede_id).filter(Boolean))];

  const [{ data: clientesData, error: errCli }, { data: sedesData, error: errSedes }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, nombre, apellido")
        .in("id", clienteIds)
        .returns<ClienteMiniNombre[]>(),
      supabase.from("sedes").select("id, nombre").in("id", sedeIds).returns<SedeMini[]>(),
    ]);

  if (errCli) throw errCli;
  if (errSedes) throw errSedes;

  const mapaClientes = new Map((clientesData ?? []).map((c) => [c.id, c]));
  const mapaSedes = new Map((sedesData ?? []).map((s) => [s.id, s.nombre]));

  return data.map((p) => {
    const cliente = mapaClientes.get(p.cliente_id);
    return {
      ...p,
      clienteNombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : "Cliente",
      sedeNombre: mapaSedes.get(p.sede_id) ?? "Sede",
    };
  });
}