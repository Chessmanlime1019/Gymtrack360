import type { ReactNode } from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface AsyncStateProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  children: ReactNode;
}

export function AsyncState({
  isLoading,
  isError,
  isEmpty = false,
  emptyMessage = "No hay datos para mostrar.",
  errorMessage = "No se pudo cargar la información. Intenta de nuevo.",
  children,
}: AsyncStateProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Cargando...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
        <AlertCircle className="w-6 h-6 text-red-600" />
        <p className="text-red-600 text-sm">{errorMessage}</p>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center py-12 text-muted text-sm">
        {emptyMessage}
      </div>
    );
  }

  return <>{children}</>;
}
