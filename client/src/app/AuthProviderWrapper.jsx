import { AuthProvider } from "../context/AuthContext";

export function AuthProviderWrapper({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
