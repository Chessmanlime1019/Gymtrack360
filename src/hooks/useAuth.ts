import { useAuthContext } from "@/context/AuthContext";

export function useAuth() {
  const {
    sesion, cargando, login, logout, registrar,
    recuperarPassword, verificarCodigoRecuperacion, actualizarPassword, refrescarPerfil,
  } = useAuthContext();

  return {
    sesion,
    cargando,
    estaAutenticado: !!sesion,
    login,
    logout,
    registrar,
    recuperarPassword,
    verificarCodigoRecuperacion,
    actualizarPassword,
    refrescarPerfil,
  };
}