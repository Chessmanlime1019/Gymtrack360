import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRedirect } from "./RoleRedirect";
import { AppShell } from "@/components/layout/AppShell";

// Cada pantalla se descarga solo cuando se visita (carga inicial mucho más liviana).
const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));

const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminClientes = lazy(() => import("@/pages/admin/Clientes"));
const AdminMembresias = lazy(() => import("@/pages/admin/Membresias"));
const AdminReportes = lazy(() => import("@/pages/admin/Reportes"));
const AdminPlanes = lazy(() => import("@/pages/admin/Planes"));
const AdminSedes = lazy(() => import("@/pages/admin/Sedes"));
const AdminUsuarios = lazy(() => import("@/pages/admin/Usuarios"));

const RecepcionDashboard = lazy(() => import("@/pages/recepcion/Dashboard"));
const RegistrarCliente = lazy(() => import("@/pages/recepcion/RegistrarCliente"));
const RecepcionMembresias = lazy(() => import("@/pages/recepcion/Membresias"));
const Asistencias = lazy(() => import("@/pages/recepcion/Asistencias"));
const Caja = lazy(() => import("@/pages/recepcion/Caja"));
const ControlAcceso = lazy(() => import("@/pages/recepcion/ControlAcceso"));
const BuscarCliente = lazy(() => import("@/pages/recepcion/BuscarCliente"));
const RegistrarPago = lazy(() => import("@/pages/recepcion/RegistrarPago"));

const ProfesionalDashboard = lazy(() => import("@/pages/profesional/Dashboard"));
const MisClientes = lazy(() => import("@/pages/profesional/MisClientes"));
const Rutinas = lazy(() => import("@/pages/profesional/Rutinas"));

const MiPerfil = lazy(() => import("@/pages/cliente/MiPerfil"));
const MiQr = lazy(() => import("@/pages/cliente/MiQr"));
const MiMembresia = lazy(() => import("@/pages/cliente/MiMembresia"));
const MisRutinas = lazy(() => import("@/pages/cliente/MisRutinas"));
const Pagar = lazy(() => import("@/pages/cliente/Pagar"));

function Cargando() {
  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}

function NoAutorizado() {
  return (
    <div className="min-h-screen grid place-items-center bg-background px-6 text-center">
      <div>
        <h1 className="text-2xl text-ink">Sin acceso</h1>
        <p className="text-muted text-sm mt-2">No tienes acceso a esta sección.</p>
        <a
          href="/"
          className="inline-block mt-5 px-5 h-11 leading-[44px] rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Cargando />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/no-autorizado" element={<NoAutorizado />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<RoleRedirect />} />
        </Route>

        {/* Admin de Sede gestiona el staff de su sede; Usuarios.tsx distingue el rol por dentro. */}
        <Route element={<ProtectedRoute rolesPermitidos={["super_admin", "admin_sede"]} />}>
          <Route element={<AppShell />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/clientes" element={<AdminClientes />} />
            <Route path="/admin/usuarios" element={<AdminUsuarios />} />
            <Route path="/admin/membresias" element={<AdminMembresias />} />
            <Route path="/admin/planes" element={<AdminPlanes />} />
            <Route path="/admin/reportes" element={<AdminReportes />} />
          </Route>
        </Route>

        {/* Sedes: exclusivo de Super Admin. */}
        <Route element={<ProtectedRoute rolesPermitidos={["super_admin"]} />}>
          <Route element={<AppShell />}>
            <Route path="/admin/sedes" element={<AdminSedes />} />
          </Route>
        </Route>

        <Route
          element={
            <ProtectedRoute rolesPermitidos={["recepcionista", "admin_sede", "super_admin"]} />
          }
        >
          <Route element={<AppShell />}>
            <Route path="/recepcion/dashboard" element={<RecepcionDashboard />} />
            <Route path="/recepcion/registrar-cliente" element={<RegistrarCliente />} />
            <Route path="/recepcion/membresias" element={<RecepcionMembresias />} />
            <Route path="/recepcion/control-acceso" element={<ControlAcceso />} />
            <Route path="/recepcion/buscar-cliente" element={<BuscarCliente />} />
            <Route path="/recepcion/registrar-pago" element={<RegistrarPago />} />
            <Route path="/recepcion/asistencias" element={<Asistencias />} />
            <Route path="/recepcion/caja" element={<Caja />} />
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
            <Route path="/cliente/pagar" element={<Pagar />} />
            <Route path="/cliente/rutinas" element={<MisRutinas />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}