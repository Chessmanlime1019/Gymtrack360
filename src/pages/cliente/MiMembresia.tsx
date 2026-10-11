import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CreditCard, Download, MapPin, QrCode, Receipt } from "lucide-react";

import { AsyncState } from "@/components/ui/AsyncState";
import { Modal } from "@/components/ui/Modal";
import { obtenerMiPerfil, obtenerMiSede } from "@/services/perfilService";
import { obtenerMisMembresias, obtenerMisPagos, type MiPago } from "@/services/miMembresiaService";

const hoyISO = () => new Date().toISOString().slice(0, 10);

function diasHasta(fechaFin: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(`${fechaFin.slice(0, 10)}T00:00:00`);
  return Math.round((fin.getTime() - hoy.getTime()) / 86_400_000);
}

function fmtFecha(f: string) {
  return new Date(`${f.slice(0, 10)}T00:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtMoney(n: number) {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Estado que ve el cliente, calculado con las fechas (no solo con el campo estado).
function estadoVisible(estado: string, fechaFin: string) {
  if (estado === "cancelada") return { texto: "Cancelada", clase: "bg-danger/10 text-danger" };
  const d = diasHasta(fechaFin);
  if (d < 0) return { texto: "Vencida", clase: "bg-muted/15 text-muted" };
  if (d === 0) return { texto: "Vence hoy", clase: "bg-danger/10 text-danger" };
  if (d <= 7) return { texto: "Por vencer", clase: "bg-warning/10 text-warning" };
  return { texto: "Activa", clase: "bg-success/10 text-success" };
}

export default function MiMembresia() {
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [pagoBoleta, setPagoBoleta] = useState<MiPago | null>(null);

  const perfil = useQuery({ queryKey: ["mi-perfil"], queryFn: obtenerMiPerfil });
  const clienteId = perfil.data?.id;

  const membresias = useQuery({
    queryKey: ["mis-membresias", clienteId],
    queryFn: () => obtenerMisMembresias(clienteId as string),
    enabled: !!clienteId,
  });
  const pagos = useQuery({
    queryKey: ["mis-pagos", clienteId],
    queryFn: () => obtenerMisPagos(clienteId as string),
    enabled: !!clienteId,
  });

  const sedeQ = useQuery({
    queryKey: ["mi-sede", perfil.data?.sede_id],
    queryFn: () => obtenerMiSede(perfil.data!.sede_id as string),
    enabled: !!perfil.data?.sede_id,
  });
  const sedeNombre = sedeQ.data?.nombre ?? "Tu sede";

  const lista = membresias.data ?? [];
  const vigente = lista.find(
    (m) => m.estado !== "cancelada" && m.fechaInicio <= hoyISO() && diasHasta(m.fechaFin) >= 0
  );
  const seleccionada = lista.find((m) => m.id === seleccionId) ?? vigente ?? lista[0] ?? null;
  const pagosSel = (pagos.data ?? []).filter((p) => p.membresiaId === seleccionada?.id);

  let progreso = 0;
  let dias = 0;
  if (vigente) {
    dias = Math.max(diasHasta(vigente.fechaFin), 0);
    const total = vigente.duracionDias ?? Math.max(diasHasta(vigente.fechaFin) - diasHasta(vigente.fechaInicio), 1);
    progreso = Math.min(Math.max(((total - dias) / total) * 100, 0), 100);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-ink">Mi membresía</h1>
        <p className="text-muted text-sm mt-1">Tu plan actual, tu historial y tus pagos.</p>
      </div>

      <AsyncState
        isLoading={perfil.isLoading || membresias.isLoading}
        isError={perfil.isError || membresias.isError}
        errorMessage="No se pudo cargar tu membresía."
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* Plan actual */}
            <section className="bg-surface border border-line rounded-2xl p-5">
              {vigente ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-muted text-xs uppercase tracking-wide">Plan actual</p>
                      <h2 className="text-xl text-ink mt-1">{vigente.planNombre}</h2>
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        estadoVisible(vigente.estado, vigente.fechaFin).clase
                      }`}
                    >
                      {estadoVisible(vigente.estado, vigente.fechaFin).texto}
                    </span>
                  </div>

                  <div className="mt-5 flex items-end gap-2">
                    <span className="gt-kpi text-5xl text-primary">{dias}</span>
                    <span className="text-muted text-sm pb-2">días restantes</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-bar overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${progreso}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted">
                    <span>Inicio {fmtFecha(vigente.fechaInicio)}</span>
                    <span>Vence {fmtFecha(vigente.fechaFin)}</span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3 text-sm text-ink-2">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={15} className="text-primary" />
                      {vigente.esMultisede ? "Todas las sedes" : sedeNombre}
                    </span>
                    {vigente.precio !== null && (
                      <span className="inline-flex items-center gap-1.5">
                        <CreditCard size={15} className="text-primary" />
                        {fmtMoney(vigente.precio)}
                      </span>
                    )}
                  </div>

                  <Link
                    to="/cliente/mi-qr"
                    className="mt-5 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-xl min-h-[48px] font-semibold"
                  >
                    <QrCode size={18} /> Mostrar mi QR para entrar
                  </Link>
                </>
              ) : (
                <div className="text-center py-6">
                  <CalendarDays className="mx-auto text-muted" size={32} />
                  <h2 className="text-lg text-ink mt-3">No tienes una membresía vigente</h2>
                  <p className="text-muted text-sm mt-1">
                    Acércate a recepción de tu sede para renovar o contratar un plan.
                  </p>
                </div>
              )}
            </section>

            {/* Historial */}
            <section>
              <h2 className="text-lg text-ink mb-3">Historial de membresías</h2>
              {lista.length === 0 ? (
                <p className="text-muted text-sm bg-surface border border-line rounded-2xl p-5">
                  Aún no tienes membresías registradas.
                </p>
              ) : (
                <ul className="space-y-3">
                  {lista.map((m) => {
                    const est = estadoVisible(m.estado, m.fechaFin);
                    const activa = seleccionada?.id === m.id;
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => setSeleccionId(m.id)}
                          className={`w-full text-left bg-surface border rounded-2xl p-4 min-h-[56px] transition-colors ${
                            activa ? "border-primary" : "border-line hover:border-line-strong"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-ink font-semibold truncate">{m.planNombre}</p>
                              <p className="text-muted text-xs mt-0.5">
                                {fmtFecha(m.fechaInicio)} → {fmtFecha(m.fechaFin)}
                              </p>
                            </div>
                            <span className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${est.clase}`}>
                              {est.texto}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Todos mis pagos */}
            <section>
              <h2 className="text-lg text-ink mb-3">Mis pagos</h2>
              {(pagos.data ?? []).length === 0 ? (
                <p className="text-muted text-sm bg-surface border border-line rounded-2xl p-5">
                  Aún no tienes pagos registrados.
                </p>
              ) : (
                <ul className="space-y-3">
                  {(pagos.data ?? []).map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setPagoBoleta(p)}
                        className="w-full flex items-center justify-between gap-3 bg-surface border border-line hover:border-line-strong rounded-2xl p-4 min-h-[56px] text-left"
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                            <Receipt size={18} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-ink font-semibold capitalize truncate">{p.metodoPago}</span>
                            <span className="block text-muted text-xs">{fmtFecha(p.fecha)}</span>
                          </span>
                        </span>
                        <span className="text-ink font-bold shrink-0">{fmtMoney(p.monto)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Panel derecho: detalle de la seleccionada */}
          <aside className="lg:sticky lg:top-6 self-start bg-surface border border-line rounded-2xl overflow-hidden">
            <div className="bg-primary px-5 py-4">
              <p className="text-white/80 text-xs uppercase tracking-wide">Detalle</p>
              <h3 className="text-white text-lg mt-1">{seleccionada?.planNombre ?? "Sin selección"}</h3>
            </div>
            {seleccionada ? (
              <div className="p-5 space-y-4 text-sm">
                <Fila label="Estado" valor={estadoVisible(seleccionada.estado, seleccionada.fechaFin).texto} />
                <Fila label="Inicio" valor={fmtFecha(seleccionada.fechaInicio)} />
                <Fila label="Vencimiento" valor={fmtFecha(seleccionada.fechaFin)} />
                <Fila
                  label="Duración"
                  valor={seleccionada.duracionDias ? `${seleccionada.duracionDias} días` : "—"}
                />
                <Fila
                  label="Sede"
                  valor={seleccionada.esMultisede ? "Todas las sedes" : sedeNombre}
                />
                <Fila label="Precio del plan" valor={seleccionada.precio !== null ? fmtMoney(seleccionada.precio) : "—"} />

                <div className="pt-4 border-t border-line">
                  <p className="text-ink font-semibold flex items-center gap-2 mb-3">
                    <Receipt size={16} className="text-primary" /> Pagos de esta membresía
                  </p>
                  {pagos.isLoading ? (
                    <p className="text-muted text-xs">Cargando…</p>
                  ) : pagosSel.length === 0 ? (
                    <p className="text-muted text-xs">No hay pagos asociados.</p>
                  ) : (
                    <ul className="space-y-2">
                      {pagosSel.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => setPagoBoleta(p)}
                            className="w-full flex items-center justify-between bg-bar hover:bg-primary/10 rounded-xl px-3 min-h-[52px] text-left"
                          >
                            <span>
                              <span className="block text-ink font-medium capitalize">{p.metodoPago}</span>
                              <span className="block text-muted text-xs">{fmtFecha(p.fecha)} · Ver boleta</span>
                            </span>
                            <span className="text-ink font-semibold">{fmtMoney(p.monto)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <p className="p-5 text-muted text-sm">Cuando tengas una membresía verás aquí su detalle.</p>
            )}
          </aside>
        </div>
      </AsyncState>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #boleta-imprimible, #boleta-imprimible * { visibility: visible; }
          #boleta-imprimible { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      <Modal isOpen={!!pagoBoleta} onClose={() => setPagoBoleta(null)} title="Boleta de pago">
        {pagoBoleta && (
          <div id="boleta-imprimible" className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <p className="text-ink font-semibold">GYMTRACK 360</p>
              <p className="text-muted text-xs">N.° {pagoBoleta.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Dato2 label="Cliente" valor={perfil.data ? `${perfil.data.nombre} ${perfil.data.apellido}` : "—"} />
              <Dato2 label="Sede" valor={sedeNombre} />
              <Dato2 label="Fecha" valor={new Date(pagoBoleta.fecha).toLocaleString("es-PE")} />
              <Dato2 label="Método" valor={pagoBoleta.metodoPago} />
              <Dato2
                label="Concepto"
                valor={lista.find((m) => m.id === pagoBoleta.membresiaId)?.planNombre ?? "Membresía"}
              />
              <Dato2 label="Monto" valor={fmtMoney(pagoBoleta.monto)} fuerte />
            </div>
            <p className="text-muted text-[11px] border-t border-line pt-3">
              Boleta simulada — no tiene validez tributaria. Solo confirma el pago dentro de GYMTRACK 360.
            </p>
            <button
              type="button"
              onClick={() => window.print()}
              className="print:hidden w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl min-h-[48px]"
            >
              <Download size={16} /> Descargar boleta (PDF)
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Dato2({ label, valor, fuerte = false }: { label: string; valor: string; fuerte?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted mb-1">{label}</p>
      <p className={`text-ink capitalize ${fuerte ? "text-base font-bold" : "font-medium"}`}>{valor}</p>
    </div>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-ink font-medium text-right">{valor}</span>
    </div>
  );
}