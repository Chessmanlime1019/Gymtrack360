import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types";

const RUTA_INICIAL_POR_ROL: Record<UserRole, string> = {
  super_admin: "/admin/dashboard",
  admin_sede: "/admin/dashboard",
  recepcionista: "/recepcion/control-acceso",
  profesional: "/profesional/dashboard",
  cliente: "/cliente/mi-perfil",
};

export function RoleRedirect() {
  const { sesion, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted">Cargando sesión...</p>
      </div>
    );
  }

  if (!sesion) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={RUTA_INICIAL_POR_ROL[sesion.role]} replace />;
}