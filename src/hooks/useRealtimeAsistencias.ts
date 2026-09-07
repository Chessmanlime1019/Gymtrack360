import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/types";

export interface AsistenciaEnVivo {
    id: string;
    clienteNombre: string;
    fechaHora: string;
}

interface AsistenciaRow {
    id: string;
    cliente_id: string;
    fecha_hora: string;
}

async function obtenerNombreCliente(clienteId: string): Promise<string> {
    const { data, error } = await supabase
        .from("profiles")
        .select("nombre, apellido")
        .eq("id", clienteId)
        .single<Pick<Profile, "nombre" | "apellido">>();

    if (error || !data) return "Cliente";
    return `${data.nombre} ${data.apellido}`;
}
export function useRealtimeAsistencias(sedeId: string | null) {
    const [asistencias, setAsistencias] = useState<AsistenciaEnVivo[]>([]);

    useEffect(() => {
        if (!sedeId) {
            setAsistencias([]);
            return;
        }

        const sedeActual = sedeId;
        let activo = true;

        async function cargarInicial() {
            const { data, error } = await supabase
                .from("asistencias")
                .select("id, cliente_id, fecha_hora")
                .eq("sede_id", sedeActual)
                .order("fecha_hora", { ascending: false })
                .limit(10)
                .returns<AsistenciaRow[]>();

            if (error) {
                console.error("Error cargando asistencias:", error);
                return;
            }
            if (!activo || !data) return;

            const conNombres = await Promise.all(
                data.map(async (a) => ({
                    id: a.id,
                    clienteNombre: await obtenerNombreCliente(a.cliente_id),
                    fechaHora: a.fecha_hora,
                }))
            );

            if (activo) setAsistencias(conNombres);
        }

        cargarInicial();

        const canal = supabase
            .channel(`asistencias-sede-${sedeActual}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "asistencias",
                    filter: `sede_id=eq.${sedeActual}`,
                },
                async (payload) => {
                    const nuevo = payload.new as AsistenciaRow;
                    const nombre = await obtenerNombreCliente(nuevo.cliente_id);

                    if (activo) {
                        setAsistencias((prev) =>
                            [
                                { id: nuevo.id, clienteNombre: nombre, fechaHora: nuevo.fecha_hora },
                                ...prev,
                            ].slice(0, 10)
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            activo = false;
            supabase.removeChannel(canal);
        };
    }, [sedeId]);

    return asistencias;
}