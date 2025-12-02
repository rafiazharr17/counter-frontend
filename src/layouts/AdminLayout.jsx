import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Tooltip } from "primereact/tooltip";

export default function AdminLayout() {
  const navigate = useNavigate();

  // State
  const [collapsed, setCollapsed] = useState(false); // Desktop collapse
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Detect screen size changes
  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (!mobile) {
        setMobileOpen(false); // close mobile drawer when back to desktop
      }
    };
    window.addEventListener("resize", handler);

    return () => window.removeEventListener("resize", handler);
  }, []);

  // Determine expanded mode for labels
  const isExpanded = isMobile ? mobileOpen : !collapsed;

  const MenuItem = ({ to, icon, label, end }) => (
    <NavLink
      to={to}
      end={end}
      onClick={() => isMobile && setMobileOpen(false)} // auto close menu on mobile
      className={({ isActive }) =>
        [
          "menu-item group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
          isActive
            ? "bg-sky-900/60 text-white shadow-sm"
            : "text-slate-100 hover:bg-sky-800/40 hover:text-white",
        ].join(" ")
      }
      // Tooltip only when collapsed in desktop mode
      {...(!isExpanded && !isMobile
        ? { "data-pr-tooltip": label, "data-pr-position": "right" }
        : {})}
    >
      <i className={`pi ${icon} text-lg`} />
      <span
        className={[
          "transition-all whitespace-nowrap duration-200",
          isExpanded
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-1",
        ].join(" ")}
      >
        {label}
      </span>
    </NavLink>
  );

  return (
    <div className="min-h-screen flex bg-gray-100 relative w-full overflow-x-hidden">
      {/* Tooltip global */}
      <Tooltip target=".menu-item[data-pr-tooltip]" showDelay={250} hideDelay={100} />

      {/* DESKTOP STATIC SIDEBAR SPACE */}
      {!isMobile && (
        <div
          className={[
            "transition-all duration-300 flex-shrink-0",
            collapsed ? "w-16" : "w-64",
          ].join(" ")}
        />
      )}

      {/* Overlay (mobile only) */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={[
          "fixed top-0 left-0 flex flex-col justify-between bg-[#003B73] z-50 shadow-lg transition-all duration-300",
          "h-dvh",

          // MOBILE drawer
          isMobile
            ? mobileOpen
              ? "w-64 translate-x-0"
              : "w-64 -translate-x-full"
            : "",

          // DESKTOP fixed collapse
          !isMobile
            ? collapsed
              ? "w-16"
              : "w-64"
            : "",
        ].join(" ")}
      >
        <div className="p-3 flex-1 flex flex-col overflow-hidden">
          {/* Logo dengan ukuran berbeda saat collapsed */}
          <div className="flex items-center gap-3 px-2 py-2 flex-shrink-0">
            <img 
              src="/mpp.png" 
              className={[
                "transition-all duration-200",
                collapsed && !isMobile ? "h-6 w-auto" : "h-10 w-auto"
              ].join(" ")} 
            />
            <div
              className={[
                "text-slate-50 font-semibold transition-all duration-200",
                isExpanded ? "opacity-100" : "opacity-0",
                isMobile ? "opacity-100" : "",
              ].join(" ")}
            >
              Mall Pelayanan Publik
            </div>
          </div>

          <div className="mt-2 h-px bg-sky-200/30 flex-shrink-0" />

          {/* Menu dengan scroll jika diperlukan */}
          <nav className="mt-3 flex flex-col gap-1 flex-1 overflow-y-auto">
            <MenuItem to="/admin" icon="pi-home" label="Dashboard" end />
            <MenuItem to="/admin/counters" icon="pi-headphones" label="Loket" />
            <MenuItem to="/admin/users" icon="pi-users" label="Manajemen User" />
            <MenuItem to="/admin/roles" icon="pi-shield" label="Roles" />
          </nav>
        </div>

        {/* Logout - fixed di bottom */}
        <div className="p-3 flex-shrink-0">
          <div className="h-px bg-sky-200/30 mb-2" />

          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-3 px-3 py-2 text-slate-100 hover:bg-sky-800/40 rounded-lg w-full"
          >
            <i className="pi pi-sign-out text-lg" />
            <span
              className={[
                "transition-all duration-200",
                isExpanded || isMobile ? "opacity-100" : "opacity-0",
              ].join(" ")}
            >
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0"> {/* Tambahkan min-w-0 di sini */}
        {/* HEADER */}
        <header className="h-14 bg-white shadow-sm px-4 flex items-center justify-between flex-shrink-0">
          <button
            className="p-2 hover:bg-gray-100 rounded-lg active:scale-95"
            onClick={() => {
              if (isMobile) {
                setMobileOpen(!mobileOpen);
              } else {
                setCollapsed(!collapsed);
              }
            }}
          >
            <i className="pi pi-bars text-xl text-gray-700" />
          </button>

          <div className="flex items-center gap-3">
            <i className="pi pi-user text-slate-500" />
            <span className="text-sm text-slate-600">Super Admin</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 flex-1 min-w-0"> {/* Tambahkan min-w-0 di sini */}
          <div className="bg-white rounded-xl shadow p-4 h-full w-full max-w-full"> {/* Tambahkan max-w-full */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}