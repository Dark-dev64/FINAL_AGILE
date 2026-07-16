import { Outlet, Navigate } from "react-router-dom";
import DashboardMenuBar from "../components/DashboardMenuBar";
import { useAuth } from "../hooks/useAuth";

function DashboardLayout() {
  const { role } = useAuth();

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <DashboardMenuBar />
      <main className="app-main dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;