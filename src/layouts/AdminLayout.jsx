import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Tooltip } from "primereact/tooltip";

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const navigate = useNavigate();

  // Expand saat tidak collapsed atau saat di-hover
  const isExpanded = !collapsed || hovering;

  const MenuItem = ({ to, icon, label, end = false }) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "menu-item group relative flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 ease-in-out",
          isActive
            ? "bg-sky-900/60 text-white shadow-sm"
            : "text-slate-100 hover:bg-sky-800/40 hover:text-white",
        ].join(" ")
      }
      // Tooltip hanya saat sidebar collapsed (tidak expanded)
      {...(!isExpanded
        ? { "data-pr-tooltip": label, "data-pr-position": "right" }
        : {})}
      title={isExpanded ? "" : label}
    >
      <i className={`pi ${icon} text-lg`} />
      {/* Label muncul saat expanded, atau saat item di-hover (bukan saat aside di-hover) */}
      <span
        className={[
          "whitespace-nowrap transition-all duration-200 ease-in-out",
          isExpanded
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0",
        ].join(" ")}
      >
        {label}
      </span>
    </NavLink>
  );

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Tooltip global untuk item sidebar saat collapsed */}
      <Tooltip target=".menu-item[data-pr-tooltip]" showDelay={250} hideDelay={100} />

      {/* SIDEBAR */}
      <aside
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={[
          "flex h-screen sticky top-0 flex-col justify-between bg-[#003B73]",
          "transition-[width] duration-300 ease-in-out",
          isExpanded ? "w-64" : "w-16",
        ].join(" ")}
      >
        <div className="p-3">
          {/* Logo + Title */}
          <div className="flex items-center gap-3 px-2 py-2">
            <img
              src="/mpp.png"
              alt="Mall Pelayanan Publik"
              className="h-10 w-auto object-contain transition-transform duration-300 ease-in-out"
            />
            <div
              className={[
                "leading-tight text-slate-50 transition-all duration-200 ease-in-out",
                isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1",
              ].join(" ")}
            >
              <div className="font-semibold text-medium">Mall Pelayanan Publik</div>
            </div>
          </div>

          <div className="mt-2 h-px bg-sky-200/30" />

          {/* MENU */}
          <nav className="mt-3 flex flex-col gap-1">
            <MenuItem to="/admin" icon="pi-home" label="Dashboard" end />
            <MenuItem to="/admin/counters" icon="pi-headphones" label="Counter" />
            <MenuItem to="/admin/users" icon="pi-users" label="User Management" />
            <MenuItem to="/admin/roles" icon="pi-shield" label="Roles" />
          </nav>
        </div>

        {/* BOTTOM - LOGOUT + COLLAPSE */}
        <div className="p-3">
          <div className="h-px bg-sky-200/30 mb-2" />

          {/* Logout */}
          <button
            onClick={() => navigate("/login")}
            className="menu-item group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-slate-100 transition-all hover:bg-sky-800/40"
            {...(!isExpanded
              ? { "data-pr-tooltip": "Logout", "data-pr-position": "right" }
              : {})}
            title={isExpanded ? "" : "Logout"}
          >
            <i className="pi pi-sign-out text-lg" />
            <span
              className={[
                "transition-all duration-200 ease-in-out",
                isExpanded
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0",
              ].join(" ")}
            >
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="h-14 bg-white shadow-sm px-4 flex items-center justify-between">
          <div className="font-medium text-slate-700" />
          <div className="flex items-center gap-3">
            <i className="pi pi-user text-slate-500" />
            <span className="text-sm text-slate-600">Super Admin</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4">
          <div className="bg-white rounded-xl shadow p-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
