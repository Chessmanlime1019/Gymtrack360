import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRedirect } from "./RoleRedirect";
import { AppShell } from "@/components/layout/AppShell";

import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";

import AdminDashboard from "@/pages/admin/Dashboard";
import AdminClientes from "@/pages/admin/Clientes";
import AdminMembresias from "@/pages/admin/Membresias";
import AdminReportes from "@/pages/admin/Reportes";

import ControlAcceso from "@/pages/recepcion/ControlAcceso";

import ProfesionalDashboard from "@/pages/profesional/Dashboard";
import MisClientes from "@/pages/profesional/MisClientes";
import Rutinas from "@/pages/profesional/Rutinas";

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

      <Route element={<ProtectedRoute rolesPermitidos={["super_admin", "admin_sede"]} />}>
        <Route element={<AppShell />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/clientes" element={<AdminClientes />} />
          <Route path="/admin/membresias" element={<AdminMembresias />} />
          <Route path="/admin/reportes" element={<AdminReportes />} />
        </Route>
      </Route>

      <Route
        element={
          <ProtectedRoute rolesPermitidos={["recepcionista", "admin_sede", "super_admin"]} />
        }
      >
        <Route element={<AppShell />}>
          <Route path="/recepcion/control-acceso" element={<ControlAcceso />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute rolesPermitidos={["profesional"]} />}>
        <Route element={<AppShell />}>
          <Route path="/profesional/dashboard" element={<ProfesionalDashboard />} />
          <Route path="/profesional/mis-clientes" element={<MisClientes />} />
          <Route path="/profesional/rutinas" element={<Rutinas />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute rolesPermitidos={["cliente"]} />}>
        <Route element={<AppShell />}>
          <Route path="/cliente/mi-perfil" element={<MiPerfil />} />
          <Route path="/cliente/mi-qr" element={<MiQr />} />
          <Route path="/cliente/mi-membresia" element={<MiMembresia />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}