import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PublicLayout from "./layouts/PublicLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import BareLayout from "./layouts/BareLayout";

import Home from "./pages/Home";
import QuienesSomos from "./pages/QuienesSomos";
import Servicios from "./pages/Servicios";
import Contacto from "./pages/Contacto";
import Login from "./pages/Login";
import Register from "./pages/Register";

import DashboardAdmin from "./pages/DashboardAdmin";
import DashboardColegiado from "./pages/DashboardColegiado";
import DashboardCajero from "./pages/DashboardCajero";
import PagoMatricula from "./pages/PagoMatricula";
import CambiarPassword from "./pages/CambiarPassword";
import RecuperarContrasena from "./pages/RecuperarContrasena";
import PagoColegiadoRemoto from "./pages/PagoColegiadoRemoto";

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
            <Route path="/pago-colegiado/:orderId" element={<PagoColegiadoRemoto />} />
          </Route>

          <Route element={<BareLayout />}>
            <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
          </Route>

          <Route element={<DashboardLayout />}>
            <Route path="/dashboard-admin" element={<DashboardAdmin />} />
            <Route path="/dashboard-colegiado" element={<DashboardColegiado />} />
            <Route path="/dashboard-cajero" element={<DashboardCajero />} />
            <Route path="/dashboard-cajero/pago" element={<PagoMatricula />} />
            <Route path="/cambiar-password" element={<CambiarPassword />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;