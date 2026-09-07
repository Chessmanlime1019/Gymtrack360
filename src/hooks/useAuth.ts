import { useAuthContext } from "@/context/AuthContext";

export function useAuth() {
  const { sesion, cargando, login, logout, registrar } = useAuthContext();

  return {
    sesion,
    cargando,
    estaAutenticado: !!sesion,
    login,
    logout,
    registrar,
  };
}