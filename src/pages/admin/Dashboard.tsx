import { Users, CreditCard, ScanLine, TrendingUp } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaPositivo?: boolean;
  icon: React.ElementType;
}

function KpiCard({ label, value, delta, deltaPositivo, icon: Icon }: KpiCardProps) {
  return (
    <div className="bg-surface rounded-xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <p className="text-muted text-xs">{label}</p>
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {delta && (
        <p className={`text-xs mt-1 ${deltaPositivo ? "text-primary" : "text-red-400"}`}>
          {delta}
        </p>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
        <p className="text-muted text-sm">Resumen general de tu sede</p>
      </div>

      {/* 1 columna en móvil, 2 en tablet, 4 en escritorio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Clientes activos" value="0" icon={Users} />
        <KpiCard label="Ingresos hoy" value="0" icon={ScanLine} />
        <KpiCard label="Membresías por vencer" value="0" icon={CreditCard} />
        <KpiCard label="Ingresos del mes" value="S/ 0" icon={TrendingUp} />
      </div>

      <div className="bg-surface rounded-xl p-4 border border-white/10">
        <p className="text-sm text-muted">
          Aquí va el gráfico de asistencias en tiempo real (siguiente módulo).
        </p>
      </div>
    </div>
  );
}