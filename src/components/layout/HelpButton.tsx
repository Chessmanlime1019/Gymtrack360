import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export function HelpButton() {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        aria-label="Ayuda"
        className="p-2 rounded-lg text-muted hover:bg-black/5 hover:text-primary transition-colors"
      >
        <CircleHelp className="w-5 h-5" />
      </button>
      <Modal isOpen={abierto} onClose={() => setAbierto(false)} title="Ayuda">
        <div className="space-y-3 text-sm text-ink/80">
          <p>
            Â¿Tienes problemas con tu cuenta, un pago o el escaneo de tu QR? Contacta a
            recepciÃ³n de tu sede o escribe a soporte:
          </p>
          <p className="text-primary">soporte@cascadagym.pe</p>
          <p className="text-muted text-xs">
            GYMTRACK 360 â€” Sistema de gestiÃ³n de Cascada Gym
          </p>
        </div>
      </Modal>
    </>
  );
}
