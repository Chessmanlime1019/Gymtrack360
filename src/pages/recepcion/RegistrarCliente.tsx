import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import {
  CheckCircle2,
  Copy,
  CreditCard,
  RefreshCw,
  UserPlus,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { crearUsuario } from "@/services/usuariosService";
import { obtenerPlanesActivos } from "@/services/planesService";
import {
  METODOS_STAFF,
  generarClave,
  obtenerQrCliente,
  venderPlan,
  type ResultadoVenta,
} from "@/services/recepcionService";

const schema = z
  .object({
    nombre: z.string().trim().min(2, "Ingresa el nombre"),
    apellido: z.string().trim().min(2, "Ingresa el apellido"),
    email: z.string().trim().email("Correo no válido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    planId: z.string(),
    metodoPago: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.planId && !v.metodoPago) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["metodoPago"],
        message: "Elige el método de pago",
      });
    }
  });
type Valores = z.infer<typeof schema>;

interface Registrado {
  id: string;
  nombre: string;
  email: string;
  password: string;
  qr: string | null;
  planNombre: string | null;
  venta: ResultadoVenta | null;
  avisoPlan: string | null;
}

const input =
  "w-full h-11 rounded-xl bg-background border border-line px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all";

function soles(n: number) {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fechaCorta(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function RegistrarCliente() {
  const { sesion } = useAuth();
  const queryClient = useQueryClient();
  const sedeId = sesion?.sedeId ?? null;

  const [registrado, setRegistrado] = useState<Registrado | null>(null);
  const [copiado, setCopiado] = useState(false);

  const planes = useQuery({
    queryKey: ["planes-activos", sedeId],
    queryFn: () => obtenerPlanesActivos(sedeId),
    enabled: !!sedeId,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Valores>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: "",
      apellido: "",
      email: "",
      password: generarClave(),
      planId: "",
      metodoPago: "",
    },
  });

  const planElegido = planes.data?.find((p) => p.id === watch("planId")) ?? null;
  const metodo = watch("metodoPago");

  const mutacion = useMutation({
    mutationFn: async (v: Valores): Promise<Registrado> => {
      if (!sedeId) throw new Error("Tu cuenta no tiene una sede asignada.");

      const { id } = await crearUsuario({
        nombre: v.nombre.trim(),
        apellido: v.apellido.trim(),
        email: v.email.trim().toLowerCase(),
        password: v.password,
        role: "cliente",
        sedeId,
      });

      let venta: ResultadoVenta | null = null;
      let avisoPlan: string | null = null;
      if (v.planId) {
        try {
          venta = await venderPlan({
            clienteId: id,
            planId: v.planId,
            metodoPago: v.metodoPago as (typeof METODOS_STAFF)[number],
          });
        } catch (e) {
          avisoPlan =
            e instanceof Error ? e.message : "No se pudo registrar el plan.";
        }
      }

      return {
        id,
        nombre: `${v.nombre.trim()} ${v.apellido.trim()}`,
        email: v.email.trim().toLowerCase(),
        password: v.password,
        qr: await obtenerQrCliente(id),
        planNombre: planElegido?.nombre ?? null,
        venta,
        avisoPlan,
      };
    },
    onSuccess: (r) => {
      setRegistrado(r);
      ["clientes", "clientes-simple", "admin-membresias", "recepcion-membresias", "recepcion-dashboard-pagos"].forEach(
        (k) => queryClient.invalidateQueries({ queryKey: [k] })
      );
    },
  });

  function nuevo() {
    setRegistrado(null);
    mutacion.reset();
    reset({
      nombre: "",
      apellido: "",
      email: "",
      password: generarClave(),
      planId: "",
      metodoPago: "",
    });
  }

  async function copiarDatos() {
    if (!registrado) return;
    const texto = `GYMTRACK 360\nCliente: ${registrado.nombre}\nUsuario: ${registrado.email}\nContraseña temporal: ${registrado.password}`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sin permiso: los datos siguen visibles en pantalla */
    }
  }

  if (!sedeId) {
    return (
      <div className="bg-surface rounded-2xl p-10 text-center text-muted text-sm border border-line">
        Tu cuenta no tiene una sede asignada. Pídele a tu Admin de Sede que te la asigne
        desde el módulo de Usuarios.
      </div>
    );
  }

  /* ============================ RESULTADO ============================ */
  if (registrado) {
    return (
      <div className="max-w-xl mx-auto space-y-5">
        <div className="bg-surface border border-line rounded-3xl overflow-hidden">
          <div className="bg-primary px-5 py-4 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-white" />
            <div>
              <p className="font-semibold text-white text-sm">Cliente registrado</p>
              <p className="text-white/80 text-xs">{registrado.nombre}</p>
            </div>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid sm:grid-cols-[1fr_auto] gap-5 items-center">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted text-xs">Usuario (correo)</p>
                  <p className="text-ink break-all">{registrado.email}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Contraseña temporal</p>
                  <p className="text-ink font-mono tracking-wide">{registrado.password}</p>
                </div>
                <p className="text-muted text-xs">
                  Entrégale estos datos al cliente. Podrá cambiar su contraseña desde Mi Perfil.
                </p>
              </div>

              {registrado.qr && (
                <div className="mx-auto bg-white p-3 rounded-2xl">
                  <QRCodeCanvas value={registrado.qr} size={132} level="M" />
                </div>
              )}
            </div>

            {registrado.venta ? (
              <div className="rounded-2xl border border-success/30 bg-success/10 p-4 text-sm space-y-1">
                <p className="text-success font-semibold">
                  Plan registrado · {registrado.planNombre}
                </p>
                <p className="text-ink-2">
                  {soles(registrado.venta.monto)} · válido del{" "}
                  {fechaCorta(registrado.venta.fechaInicio)} al{" "}
                  {fechaCorta(registrado.venta.fechaFin)}
                </p>
              </div>
            ) : registrado.avisoPlan ? (
              <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
                El cliente se creó, pero no se pudo registrar el plan: {registrado.avisoPlan}. Puedes
                asignarlo desde Membresías.
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-background p-4 text-sm text-muted">
                Sin plan por ahora. Puedes venderle uno desde Membresías.
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={copiarDatos}
                className="flex-1 h-11 rounded-xl border border-line text-ink text-sm font-medium hover:border-line-strong inline-flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                {copiado ? "Copiado" : "Copiar datos"}
              </button>
              <button
                onClick={nuevo}
                className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark inline-flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Registrar otro
              </button>
            </div>
            <Link
              to="/recepcion/membresias"
              className="block text-center text-sm text-primary hover:underline"
            >
              Ir a Membresías
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ============================ FORMULARIO ============================ */
  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl text-ink">Registrar cliente</h1>
        <p className="text-muted text-sm mt-1">
          Da de alta a un cliente nuevo en tu sede. Opcionalmente, véndele su primer plan.
        </p>
      </div>

      <form
        onSubmit={handleSubmit((v) => mutacion.mutate(v))}
        className="bg-surface border border-line rounded-3xl p-5 space-y-5"
        noValidate
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nombre" className="block text-xs text-muted mb-1.5">
              Nombre
            </label>
            <input id="nombre" autoComplete="off" {...register("nombre")} className={input} />
            {errors.nombre && <p className="text-danger text-xs mt-1">{errors.nombre.message}</p>}
          </div>
          <div>
            <label htmlFor="apellido" className="block text-xs text-muted mb-1.5">
              Apellido
            </label>
            <input id="apellido" autoComplete="off" {...register("apellido")} className={input} />
            {errors.apellido && (
              <p className="text-danger text-xs mt-1">{errors.apellido.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-xs text-muted mb-1.5">
            Correo (será su usuario)
          </label>
          <input
            id="email"
            type="email"
            autoComplete="off"
            {...register("email")}
            className={input}
          />
          {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-xs text-muted">
              Contraseña temporal
            </label>
            <button
              type="button"
              onClick={() => setValue("password", generarClave(), { shouldValidate: true })}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Generar otra
            </button>
          </div>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            {...register("password")}
            className={input}
          />
          {errors.password && (
            <p className="text-danger text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        <div className="border-t border-line pt-5 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-ink">Primer plan (opcional)</p>
          </div>

          <div>
            <label htmlFor="planId" className="block text-xs text-muted mb-1.5">
              Plan
            </label>
            <select id="planId" {...register("planId")} className={input}>
              <option value="">Sin plan por ahora</option>
              {planes.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} · {soles(p.precio)} · {p.duracion_dias} días
                </option>
              ))}
            </select>
          </div>

          {planElegido && (
            <div>
              <p className="block text-xs text-muted mb-1.5">Método de pago</p>
              <div className="grid grid-cols-2 gap-2">
                {METODOS_STAFF.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setValue("metodoPago", m, { shouldValidate: true })}
                    aria-pressed={metodo === m}
                    className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                      metodo === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-line text-ink-2 hover:border-line-strong"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {errors.metodoPago && (
                <p className="text-danger text-xs mt-1">{errors.metodoPago.message}</p>
              )}
              <div className="mt-3 flex items-center justify-between rounded-xl bg-background border border-line px-4 py-3 text-sm">
                <span className="text-muted">Total a cobrar</span>
                <span className="text-ink font-semibold">{soles(planElegido.precio)}</span>
              </div>
            </div>
          )}
        </div>

        {mutacion.isError && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-xl px-4 py-3">
            {mutacion.error instanceof Error
              ? mutacion.error.message
              : "No se pudo registrar al cliente."}
          </div>
        )}

        <button
          type="submit"
          disabled={mutacion.isPending}
          className="w-full h-12 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutacion.isPending
            ? "Registrando..."
            : planElegido
              ? `Registrar y cobrar ${soles(planElegido.precio)}`
              : "Registrar cliente"}
        </button>
      </form>
    </div>
  );
}