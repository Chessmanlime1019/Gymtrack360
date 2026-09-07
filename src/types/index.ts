export * from "./database.types";

// Respuesta de la función RPC validar_acceso_qr (la crearemos en 0003)
export interface ValidacionAcceso {
  autorizado: boolean;
  motivo: string | null;
  cliente: string | null;
  plan: string | null;
}

// Sesión de usuario enriquecida con su perfil (usada en AuthContext)
export interface SesionUsuario {
  userId: string;
  email: string;
  nombre: string;
  apellido: string;
  role: import("./database.types").UserRole;
  sedeId: string | null;
}