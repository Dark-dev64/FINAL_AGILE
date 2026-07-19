import { Outlet } from "react-router-dom";

function BareLayout() {
  return (
    <div className="app-layout">
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export default BareLayout;