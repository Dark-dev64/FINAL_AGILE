import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PublicLayout from "./layouts/PublicLayout";
import DashboardLayout from "./layouts/DashboardLayout";

import Home from "./pages/Home";
import QuienesSomos from "./pages/QuienesSomos";
import Servicios from "./pages/Servicios";
import Contacto from "./pages/Contacto";
import Login from "./pages/Login";
import Register from "./pages/Register";

import DashboardAdmin from "./pages/DashboardAdmin";
import SolicitudesAdmin from "./pages/SolicitudesAdmin";
import DashboardColegiado from "./pages/DashboardColegiado";
import DashboardCajero from "./pages/DashboardCajero";
import PruebaCajero from "./pages/PruebaCajero";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/quienes-somos" element={<QuienesSomos />} />
            <Route path="/servicios" element={<Servicios />} />
            <Route path="/contacto" element={<Contacto />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          <Route element={<DashboardLayout />}>
            <Route path="/dashboard-admin" element={<DashboardAdmin />} />
            <Route path="/dashboard-admin/solicitudes" element={<SolicitudesAdmin />} />
            <Route path="/dashboard-colegiado" element={<DashboardColegiado />} />
            <Route path="/dashboard-cajero" element={<DashboardCajero />} />
            <Route path="/dashboard-cajero/prueba" element={<PruebaCajero />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;