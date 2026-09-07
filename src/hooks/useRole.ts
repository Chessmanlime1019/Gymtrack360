import { useAuth } from "./useAuth";
import type { UserRole } from "@/types";

export function useRole() {
  const { sesion } = useAuth();

  function tieneRole(...roles: UserRole[]) {
    if (!sesion) return false;
    return roles.includes(sesion.role);
  }

  return {
    role: sesion?.role ?? null,
    sedeId: sesion?.sedeId ?? null,
    tieneRole,
    esSuperAdmin: sesion?.role === "super_admin",
    esAdminSede: sesion?.role === "admin_sede",
    esRecepcionista: sesion?.role === "recepcionista",
    esProfesional: sesion?.role === "profesional",
    esCliente: sesion?.role === "cliente",
  };
}