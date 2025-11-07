import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "primereact/button";

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const navigate = useNavigate();

  const isExpanded = !collapsed || hovering;

  const MenuItem = ({ to, icon, label }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2 rounded-lg transition-all
         ${isActive ? "bg-sky-900/60 text-white" : "text-slate-100 hover:bg-sky-900/40"}`
      }
      title={label}
    >
      <i className={`pi ${icon} text-lg`} />
      {/* Label muncul saat expanded */}
      <span
        className={`whitespace-nowrap transition-opacity duration-150
        ${isExpanded ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
      >
        {label}
      </span>
    </NavLink>
  );

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* SIDEBAR */}
      <aside
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={`flex flex-col justify-between h-screen sticky top-0 transition-all duration-200
        ${isExpanded ? "w-64" : "w-16"}
        bg-[#003B73]`}
      >
        <div className="p-3">
          {/* Logo + Title */}
          <div className="flex items-center gap-3 px-2 py-2">
            <img
              src="/mpp.png"
              alt="Mall Pelayanan Publik"
              className="h-10 w-auto object-contain"
            />
            <div
              className={`leading-tight text-slate-50 transition-opacity duration-150
              ${isExpanded ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            >
              <div className="font-semibold text-sm">Mall Pelayanan</div>
              <div className="font-semibold text-sm -mt-0.5">Publik</div>
            </div>
          </div>

          <div className="mt-2 h-px bg-sky-200/30" />

          {/* MENU */}
          <nav className="mt-3 flex flex-col gap-1">
            <MenuItem to="/admin" icon="pi-home" label="Dashboard" />
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
            className="group flex items-center gap-3 px-3 py-2 rounded-lg w-full text-left
            text-slate-100 hover:bg-sky-900/40"
            title="Logout"
          >
            <i className="pi pi-sign-out text-lg" />
            <span
              className={`transition-opacity duration-150
              ${isExpanded ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            >
              Logout
            </span>
          </button>

          {/* Collapse Toggle */}
          <div className="mt-2 flex justify-end">
            <Button
              type="button"
              onClick={() => setCollapsed((s) => !s)}
              rounded
              text
              plain
              icon={`pi ${collapsed ? "pi-angle-right" : "pi-angle-left"}`}
            />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 bg-white shadow-sm px-4 flex items-center justify-between">
          <div className="font-medium text-slate-700"></div>
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
