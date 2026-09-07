import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  huboError: boolean;
  mensaje: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { huboError: false, mensaje: null };

  static getDerivedStateFromError(error: Error): State {
    return { huboError: true, mensaje: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Aquí en el futuro podemos mandar esto a un servicio de logging.
    console.error("Error atrapado por ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.huboError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-sm text-center space-y-4">
            <h1 className="text-xl font-bold text-red-400">Algo salió mal</h1>
            <p className="text-muted text-sm">
              {this.state.mensaje ?? "Ocurrió un error inesperado."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-background font-semibold rounded-lg px-4 py-2 text-sm"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}