import { type ReactNode } from "react";

import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">

      {/* Overlay */}
      <div
        className="
          absolute
          inset-0
          bg-black/75
          backdrop-blur-[2px]
        "
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="
          relative
          bg-[#1a1e22]
          border
          border-[#30363d]
          rounded-t-2xl
          sm:rounded-2xl
          w-full
          sm:max-w-md
          max-h-[90vh]
          overflow-y-auto
          shadow-[0_25px_80px_rgba(0,0,0,0.45)]
        "
      >

        {/* Header */}
        <div
          className="
            flex
            items-center
            justify-between
            px-5
            py-4
            border-b
            border-[#2a3036]
            sticky
            top-0
            bg-[#1a1e22]/95
            backdrop-blur-xl
            z-10
          "
        >
          <div className="flex items-center gap-3">

            <div
              className="
                w-8
                h-8
                rounded-lg
                bg-[#f15a24]/10
                border
                border-[#f15a24]/15
                flex
                items-center
                justify-center
              "
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#f15a24]" />
            </div>

            <h2 className="font-semibold text-sm text-white">
              {title}
            </h2>

          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="
              p-2
              rounded-lg
              text-[#89939d]
              hover:bg-white/[0.05]
              hover:text-white
              transition-colors
            "
          >
            <X className="w-4 h-4" />
          </button>

        </div>

        {/* Contenido */}
        <div className="p-5 bg-[#1a1e22]">
          {children}
        </div>

      </div>
    </div>
  );
}