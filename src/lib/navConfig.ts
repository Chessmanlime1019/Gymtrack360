import type { UserRole } from "@/types";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart3,
  ScanLine,
  Dumbbell,
  UserSquare2,
  QrCode,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

// Máximo recomendado: 5 items por rol si quieres que la bottom nav
// de móvil se vea bien sin apretujarse. Si un módulo crece más,
// hay que migrar ese rol a un drawer lateral en vez de bottom nav.
export const NAV_POR_ROL: Record<UserRole, NavItem[]> = {
  super_admin: [
    { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Clientes", path: "/admin/clientes", icon: Users },
    { label: "Membresías", path: "/admin/membresias", icon: CreditCard },
    { label: "Reportes", path: "/admin/reportes", icon: BarChart3 },
  ],
  admin_sede: [
    { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Clientes", path: "/admin/clientes", icon: Users },
    { label: "Membresías", path: "/admin/membresias", icon: CreditCard },
    { label: "Reportes", path: "/admin/reportes", icon: BarChart3 },
  ],
  recepcionista: [
    { label: "Control de Acceso", path: "/recepcion/control-acceso", icon: ScanLine },
  ],
  profesional: [
    { label: "Dashboard", path: "/profesional/dashboard", icon: LayoutDashboard },
    { label: "Mis Clientes", path: "/profesional/mis-clientes", icon: Users },
    { label: "Rutinas", path: "/profesional/rutinas", icon: Dumbbell },
  ],
  cliente: [
    { label: "Mi Perfil", path: "/cliente/mi-perfil", icon: UserSquare2 },
    { label: "Mi QR", path: "/cliente/mi-qr", icon: QrCode },
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