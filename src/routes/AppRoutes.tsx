import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRedirect } from "./RoleRedirect";

// Auth
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";

// Admin
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminClientes from "@/pages/admin/Clientes";
import AdminMembresias from "@/pages/admin/Membresias";
import AdminReportes from "@/pages/admin/Reportes";

// Recepción
import ControlAcceso from "@/pages/recepcion/ControlAcceso";

// Profesional
import ProfesionalDashboard from "@/pages/profesional/Dashboard";
import MisClientes from "@/pages/profesional/MisClientes";
import Rutinas from "@/pages/profesional/Rutinas";

// Cliente
import MiPerfil from "@/pages/cliente/MiPerfil";
import MiQr from "@/pages/cliente/MiQr";
import MiMembresia from "@/pages/cliente/MiMembresia";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/no-autorizado"
        element={<div className="p-8">No tienes acceso a esta sección.</div>}
      />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<RoleRedirect />} />
      </Route>

      {/* super_admin + admin_sede */}
      <Route element={<ProtectedRoute rolesPermitidos={["super_admin", "admin_sede"]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/clientes" element={<AdminClientes />} />
        <Route path="/admin/membresias" element={<AdminMembresias />} />
        <Route path="/admin/reportes" element={<AdminReportes />} />
      </Route>

      {/* recepcionista (+ admin_sede/super_admin también pueden operar recepción) */}
      <Route
        element={
          <ProtectedRoute
            rolesPermitidos={["recepcionista", "admin_sede", "super_admin"]}
          />
        }
      >
        <Route path="/recepcion/control-acceso" element={<ControlAcceso />} />
      </Route>

      {/* profesional */}
      <Route element={<ProtectedRoute rolesPermitidos={["profesional"]} />}>
        <Route path="/profesional/dashboard" element={<ProfesionalDashboard />} />
        <Route path="/profesional/mis-clientes" element={<MisClientes />} />
        <Route path="/profesional/rutinas" element={<Rutinas />} />
      </Route>

      {/* cliente */}
      <Route element={<ProtectedRoute rolesPermitidos={["cliente"]} />}>
        <Route path="/cliente/mi-perfil" element={<MiPerfil />} />
        <Route path="/cliente/mi-qr" element={<MiQr />} />
        <Route path="/cliente/mi-membresia" element={<MiMembresia />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}