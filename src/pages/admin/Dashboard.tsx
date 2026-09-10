import {
  Users,
  CreditCard,
  ScanLine,
  TrendingUp,
} from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaPositivo?: boolean;
  icon: React.ElementType;
}

function KpiCard({
  label,
  value,
  delta,
  deltaPositivo,
  icon: Icon,
}: KpiCardProps) {
  return (
    <div
      className="
        bg-[#1a1e22]
        rounded-[14px]
        p-5
        border
        border-[#30363d]
        shadow-[0_8px_25px_rgba(0,0,0,0.12)]
        hover:border-[#3a424a]
        transition-all
      "
    >
      <div className="flex items-center justify-between mb-3">

        <p className="text-[#89939d] text-xs font-medium">
          {label}
        </p>

        <div
          className="
            w-9
            h-9
            rounded-lg
            bg-[#f15a24]/10
            border
            border-[#f15a24]/10
            flex
            items-center
            justify-center
          "
        >
          <Icon className="w-[18px] h-[18px] text-[#f15a24]" />
        </div>

      </div>

      <p className="text-[28px] font-bold tracking-tight text-white">
        {value}
      </p>

      {delta && (
        <p
          className={`
            text-xs
            mt-2
            font-medium
            ${deltaPositivo ? "text-[#f15a24]" : "text-red-400"}
          `}
        >
          {delta}
        </p>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="space-y-7">

      {/* =====================================================
          CABECERA
      ===================================================== */}
      <div>
        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-white">
          Dashboard
        </h1>

        <p className="text-[#89939d] text-sm mt-1">
          Resumen general de tu sede
        </p>
      </div>

      {/* =====================================================
          KPIs
      ===================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <KpiCard
          label="Clientes activos"
          value="0"
          icon={Users}
        />

        <KpiCard
          label="Ingresos hoy"
          value="0"
          icon={ScanLine}
        />

        <KpiCard
          label="Membresías por vencer"
          value="0"
          icon={CreditCard}
        />

        <KpiCard
          label="Ingresos del mes"
          value="S/ 0"
          icon={TrendingUp}
        />

      </div>

      {/* =====================================================
          PANEL DEL GRÁFICO
      ===================================================== */}
      <div
        className="
          bg-[#1a1e22]
          rounded-[14px]
          border
          border-[#30363d]
          overflow-hidden
          shadow-[0_8px_25px_rgba(0,0,0,0.12)]
        "
      >

        {/* Cabecera */}
        <div
          className="
            px-5
            py-4
            border-b
            border-[#2a3036]
            flex
            items-center
            gap-3
          "
        >

          <div
            className="
              w-9
              h-9
              rounded-lg
              bg-[#f15a24]/10
              border
              border-[#f15a24]/10
              flex
              items-center
              justify-center
            "
          >
            <TrendingUp className="w-[18px] h-[18px] text-[#f15a24]" />
          </div>

          <div>

            <p className="text-sm font-semibold text-white">
              Asistencias en tiempo real
            </p>

            <div className="flex items-center gap-2 mt-1">

              <span className="w-2 h-2 rounded-full bg-[#f15a24] animate-pulse" />

              <span className="text-[11px] text-[#89939d]">
                Próximo módulo
              </span>

            </div>

          </div>

        </div>

        {/* Contenido */}
        <div className="px-5 py-7">

          <div
            className="
              rounded-xl
              border
              border-[#2a3036]
              bg-[#171b1f]
              min-h-[180px]
              flex
              items-center
              justify-center
            "
          >

            <div className="text-center">

              <div
                className="
                  w-12
                  h-12
                  mx-auto
                  rounded-full
                  bg-[#f15a24]/10
                  border
                  border-[#f15a24]/15
                  flex
                  items-center
                  justify-center
                  mb-4
                "
              >
                <TrendingUp className="w-5 h-5 text-[#f15a24]" />
              </div>

              <p className="text-white/70 text-sm font-medium">
                Gráfico de asistencias
              </p>

              <p className="text-[#6f7982] text-xs mt-1">
                Aquí se mostrará el gráfico en tiempo real.
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}