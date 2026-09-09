export type UserRole =
  | "super_admin"
  | "admin_sede"
  | "recepcionista"
  | "profesional"
  | "cliente";

export type MembresiaEstado = "activa" | "vencida" | "cancelada";

export interface Sede {
  id: string;
  nombre: string;
  direccion: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  nombre: string;
  apellido: string;
  role: UserRole;
  sede_id: string | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  nombre: string;
  precio: number;
  duracion_dias: number;
  es_multisede: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Membresia {
  id: string;
  cliente_id: string;
  plan_id: string;
  sede_origen_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: MembresiaEstado;
  created_at: string;
  updated_at: string;
}

export interface Pago {
  id: string;
  cliente_id: string;
  membresia_id: string;
  sede_id: string;
  monto: number;
  metodo_pago: string;
  fecha: string;
  comprobante_url: string | null;
  created_at: string;
}

export interface Asistencia {
  id: string;
  cliente_id: string;
  sede_id: string;
  fecha_hora: string;
}

export interface ProfesionalCliente {
  id: string;
  profesional_id: string;
  cliente_id: string;
  sede_id: string;
  created_at: string;
}

export interface Ejercicio {
  id: string;
  nombre: string;
  grupo_muscular: string | null;
  created_at: string;
}

export interface Rutina {
  id: string;
  profesional_id: string;
  cliente_id: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface RutinaEjercicio {
  id: string;
  rutina_id: string;
  ejercicio_id: string;
  series: number;
  repeticiones: number;
  orden: number;
  notas: string | null;
}

// ============================================
// Forma completa que @supabase/supabase-js v2 espera.
// "Relationships" es obligatorio (aunque vacío) en versiones
// recientes de postgrest-js, o el inferidor de tipos colapsa a "never".
// ============================================
export interface Database {
  public: {
    Tables: {
      sedes: {
        Row: Sede;
        Insert: Partial<Sede>;
        Update: Partial<Sede>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [];
      };
      planes: {
        Row: Plan;
        Insert: Partial<Plan>;
        Update: Partial<Plan>;
        Relationships: [];
      };
      membresias: {
        Row: Membresia;
        Insert: Partial<Membresia>;
        Update: Partial<Membresia>;
        Relationships: [];
      };
      pagos: {
        Row: Pago;
        Insert: Partial<Pago>;
        Update: Partial<Pago>;
        Relationships: [];
      };
      asistencias: {
        Row: Asistencia;
        Insert: Partial<Asistencia>;
        Update: Partial<Asistencia>;
        Relationships: [];
      };
      profesional_clientes: {
        Row: ProfesionalCliente;
        Insert: Partial<ProfesionalCliente>;
        Update: Partial<ProfesionalCliente>;
        Relationships: [];
      };
      ejercicios: {
        Row: Ejercicio;
        Insert: Partial<Ejercicio>;
        Update: Partial<Ejercicio>;
        Relationships: [];
      };
      rutinas: {
        Row: Rutina;
        Insert: Partial<Rutina>;
        Update: Partial<Rutina>;
        Relationships: [];
      };
      rutina_ejercicios: {
        Row: RutinaEjercicio;
        Insert: Partial<RutinaEjercicio>;
        Update: Partial<RutinaEjercicio>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      validar_acceso_qr: {
        Args: { p_qr_code: string; p_sede_actual_id: string };
        Returns: {
          autorizado: boolean;
          motivo: string | null;
          cliente: string | null;
          plan: string | null;
        };
      };
      obtener_kpis_sede: {
        Args: { p_sede_id: string };
        Returns: {
          clientesActivos: number;
          checkinsHoy: number;
          membresiasPorVencer: number;
          ingresosMes: number;
        };
      };
    };
    Enums: {
      user_role: UserRole;
      membresia_estado: MembresiaEstado;
    };
    CompositeTypes: Record<string, never>;
  };
}