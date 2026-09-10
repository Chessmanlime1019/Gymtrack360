import { type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-surface border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line sticky top-0 bg-surface/95 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>
            <h2 className="font-semibold text-sm text-ink">{title}</h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-lg text-muted hover:bg-white/5 hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 bg-surface">{children}</div>
      </div>
    </div>
  );
}