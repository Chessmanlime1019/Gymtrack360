import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

// Campo de contraseña con el "ojito" para mostrarla u ocultarla.
// Funciona igual que un <input> normal, también con {...register("campo")}
// de react-hook-form (por eso usa forwardRef). El className se aplica al input.
export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { className = "", ...props },
  ref
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute right-0 top-0 h-full w-12 grid place-items-center text-muted hover:text-ink"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
});