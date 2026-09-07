import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types";

interface ProtectedRouteProps {
  rolesPermitidos?: UserRole[];
}

export function ProtectedRoute({ rolesPermitidos }: ProtectedRouteProps) {
  const { sesion, cargando, estaAutenticado } = useAuth();

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted">Cargando sesión...</p>
      </div>
    );
  }

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos && sesion && !rolesPermitidos.includes(sesion.role)) {
    return <Navigate to="/no-autorizado" replace />;
  }

  return <Outlet />;
}