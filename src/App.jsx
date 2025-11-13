import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";

// COUNTERS
import HomeCounter from "./pages/admin/counters/HomeCounter";
import DetailCounter from "./pages/admin/counters/DetailCounter";
import AddCounter from "./pages/admin/counters/AddCounter";
import EditCounter from "./pages/admin/counters/EditCounter";
import DashboardAdmin from "./pages/admin/DashboardAdmin";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AmbilAntrean from "./pages/guest/AmbilAntrean";

// Placeholders
function AdminDashboard() {
  return <div>Dashboard Admin</div>;
}
function UsersHome() {
  return <div>User Management</div>;
}
function RolesHome() {
  return <div>Roles</div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardAdmin />} />

        <Route path="counters" element={<HomeCounter />} />
        <Route path="counters/new" element={<AddCounter />} />
        <Route path="counters/:id" element={<DetailCounter />} />
        <Route path="counters/:id/edit" element={<EditCounter />} />

        <Route path="users" element={<UsersHome />} />
        <Route path="roles" element={<RolesHome />} />
      </Route>
      <Route path="ambil-antrean" element={<AmbilAntrean />} />

      <Route path="*" element={<div>404 Not Found</div>} />
    </Routes>
  );
}
