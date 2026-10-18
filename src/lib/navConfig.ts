import type { UserRole } from "@/types";
import {
  LayoutDashboard,
  Users,
  UserCog,
  CreditCard,
  Tags,
  Building2,
  BarChart3,
  ScanLine,
  Dumbbell,
  UserSquare2,
  QrCode,
  Wallet,
  Search,
  UserPlus,
  CalendarCheck,
  Landmark,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const NAV_POR_ROL: Record<UserRole, NavItem[]> = {
  super_admin: [
    { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Clientes", path: "/admin/clientes", icon: Users },
    { label: "Usuarios", path: "/admin/usuarios", icon: UserCog },
    { label: "Membresías", path: "/admin/membresias", icon: CreditCard },
    { label: "Planes", path: "/admin/planes", icon: Tags },
    { label: "Sedes", path: "/admin/sedes", icon: Building2 },
    { label: "Reportes", path: "/admin/reportes", icon: BarChart3 },
  ],
  admin_sede: [
    { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Clientes", path: "/admin/clientes", icon: Users },
    // Nuevo: Admin de Sede gestiona el staff (recepción/profesional) de
    // su propia sede. Usa la misma pantalla que Super Admin
    // (src/pages/admin/Usuarios.tsx), que ya distingue el rol por dentro.
    { label: "Usuarios", path: "/admin/usuarios", icon: UserCog },
    { label: "Membresías", path: "/admin/membresias", icon: CreditCard },
    { label: "Planes", path: "/admin/planes", icon: Tags },
    { label: "Reportes", path: "/admin/reportes", icon: BarChart3 },
  ],
  recepcionista: [
    { label: "Panel", path: "/recepcion/dashboard", icon: LayoutDashboard },
    { label: "Control de Acceso", path: "/recepcion/control-acceso", icon: ScanLine },
    { label: "Registrar Cliente", path: "/recepcion/registrar-cliente", icon: UserPlus },
    { label: "Membresías", path: "/recepcion/membresias", icon: CreditCard },
    { label: "Buscar Cliente", path: "/recepcion/buscar-cliente", icon: Search },
    { label: "Registrar Pago", path: "/recepcion/registrar-pago", icon: Wallet },
    { label: "Asistencias", path: "/recepcion/asistencias", icon: CalendarCheck },
    { label: "Caja del Día", path: "/recepcion/caja", icon: Landmark },
  ],
  profesional: [
    { label: "Dashboard", path: "/profesional/dashboard", icon: LayoutDashboard },
    { label: "Mis Clientes", path: "/profesional/mis-clientes", icon: Users },
    { label: "Rutinas", path: "/profesional/rutinas", icon: Dumbbell },
  ],
  cliente: [
    { label: "Mi Perfil", path: "/cliente/mi-perfil", icon: UserSquare2 },
    { label: "Mi QR", path: "/cliente/mi-qr", icon: QrCode },
    { label: "Mis Rutinas", path: "/cliente/rutinas", icon: Dumbbell },
    { label: "Pagar", path: "/cliente/pagar", icon: Wallet },
    { label: "Mi Membresía", path: "/cliente/mi-membresia", icon: Wallet },
  ],
};

export const ETIQUETA_ROL: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin_sede: "Admin de Sede",
  recepcionista: "Recepción",
  profesional: "Profesional",
  cliente: "Cliente",
};