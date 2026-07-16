import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  // TODO: cuando exista backend, esto se reemplaza por la sesión real (JWT/Supabase Auth)
  const [role, setRole] = useState(() => localStorage.getItem("role") || null);

  useEffect(() => {
    if (role) {
      localStorage.setItem("role", role);
    } else {
      localStorage.removeItem("role");
    }
  }, [role]);

  function login(userRole) {
    setRole(userRole);
  }

  function logout() {
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}