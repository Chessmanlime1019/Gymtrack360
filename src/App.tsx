import { AuthProvider } from "@/context/AuthContext";
import { TemaProvider } from "@/context/TemaContext";
import { AppRoutes } from "@/routes/AppRoutes";

export default function App() {
  return (
    <TemaProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </TemaProvider>
  );
}