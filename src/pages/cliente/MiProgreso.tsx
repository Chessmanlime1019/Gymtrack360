import { useAuth } from "@/hooks/useAuth";
import { ProgresoCliente } from "@/components/progreso/ProgresoCliente";

export default function MiProgreso() {
  const { sesion } = useAuth();

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl text-ink">Mi progreso</h1>
        <p className="text-muted text-sm mt-1">
          Registra tu peso y tus medidas y mira cómo evolucionas. Tu profesional también puede verlo.
        </p>
      </div>

      {sesion?.userId && <ProgresoCliente clienteId={sesion.userId} puedeRegistrar />}
    </div>
  );
}