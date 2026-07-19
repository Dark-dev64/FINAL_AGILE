import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const stored = localStorage.getItem("session");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (session) {
      localStorage.setItem("session", JSON.stringify(session));
    } else {
      localStorage.removeItem("session");
    }
  }, [session]);

  function login(usuario) {
    setSession(usuario);
  }

  function logout() {
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, role: session?.rol ?? null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}