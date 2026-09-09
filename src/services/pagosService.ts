import { supabase } from "@/lib/supabaseClient";
import type { Pago } from "@/types";

export const METODOS_PAGO = ["Efectivo", "Yape", "Plin", "Transferencia"] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export interface PagoConDetalle extends Pago {
  clienteNombre: string;
}

interface ClienteMini {
  id: string;
  nombre: string;
  apellido: string;
}

export async function obtenerPagos(sedeId: string | null): Promise<PagoConDetalle[]> {
  let query = supabase
    .from("pagos")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(50);

  if (sedeId) {
    query = query.eq("sede_id", sedeId);
  }

  const { data, error } = await query.returns<Pago[]>();
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const clienteIds = [...new Set(data.map((p) => p.cliente_id))];
  const { data: clientes, error: errCli } = await supabase
    .from("profiles")
    .select("id, nombre, apellido")
    .in("id", clienteIds)
    .returns<ClienteMini[]>();

  if (errCli) throw errCli;
  const mapaClientes = new Map((clientes ?? []).map((c) => [c.id, c]));

  return data.map((pago) => {
    const cliente = mapaClientes.get(pago.cliente_id);
    return {
      ...pago,
      clienteNombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : "Cliente",
    };
  });
}

async function subirComprobante(file: File, pagoId: string): Promise<string> {
  const extension = file.name.split(".").pop();
  const path = `${pagoId}.${extension}`;

  const { error } = await supabase.storage
    .from("comprobantes")
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("comprobantes").getPublicUrl(path);
  return data.publicUrl;
}

export async function registrarPago(params: {
  clienteId: string;
  membresiaId: string;
  sedeId: string;
  monto: number;
  metodoPago: MetodoPago;
  comprobante?: File;
}) {
  const pagoId = crypto.randomUUID();

  let comprobanteUrl: string | null = null;
  if (params.comprobante) {
    comprobanteUrl = await subirComprobante(params.comprobante, pagoId);
  }

  const { error } = await (supabase.from("pagos") as any).insert({
    id: pagoId,
    cliente_id: params.clienteId,
    membresia_id: params.membresiaId,
    sede_id: params.sedeId,
    monto: params.monto,
    metodo_pago: params.metodoPago,
    comprobante_url: comprobanteUrl,
  });

  if (error) throw error;
}