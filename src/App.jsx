import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";

import HomeCounter from "./pages/admin/counters/HomeCounter";
import DetailCounter from "./pages/admin/counters/DetailCounter";
import AddCounter from "./pages/admin/counters/AddCounter";
import EditCounter from "./pages/admin/counters/EditCounter";
import DashboardAdmin from "./pages/admin/DashboardAdmin";
import RestoreCounter from "./pages/admin/counters/RestoreCounter";

import UserManagement from "./pages/admin/user_management/HomeUserManagement";
import AddUser from "./pages/admin/user_management/AddUser";
import RestoreUser from "./pages/admin/user_management/RestoreUser";
import DetailUser from "./pages/admin/user_management/DetailUser";
import EditUser from "./pages/admin/user_management/EditUser";
import LoketUser from "./pages/admin/user_management/LoketUser";


import Login from "./pages/Login";
import Register from "./pages/Register";


import AmbilAntrean from "./pages/guest/AmbilAntrean";
import DashboardCS from "./pages/cs/DashboardCS";
import EditCS from "./pages/cs/EditCS";
import DetailCS from "./pages/cs/DetailCS";
import DisplayScreen from "./pages/cs/DisplayScreen";

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

      {/* ADMIN */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardAdmin />} />

        <Route path="counters" element={<HomeCounter />} />
        <Route path="counters/new" element={<AddCounter />} />
        <Route path="counters/:id" element={<DetailCounter />} />
        <Route path="counters/:id/edit" element={<EditCounter />} />
        <Route path="counters/restore" element={<RestoreCounter />} />

        <Route path="users" element={<UserManagement />} />
        <Route path="users/add" element={<AddUser />} />
        <Route path="users/restore" element={<RestoreUser />} />
        <Route path="users/:id" element={<DetailUser />} />
        <Route path="users/:id/edit" element={<EditUser />} />
        <Route path="users/loket-management" element={<LoketUser />} />
        
        <Route path="roles" element={<RolesHome />} />
      </Route>

      {/* CUSTOMER SERVICE */}
      <Route path="/cs" element={<DashboardCS />} />
      <Route path="/cs/counters/:id" element={<DetailCS />} />
      <Route path="/cs/counters/:id/edit" element={<EditCS />} />
      <Route path="/cs/display" element={<DisplayScreen />} />

      {/* GUEST */}
      <Route path="/ambil-antrean" element={<AmbilAntrean />} />

      <Route path="*" element={<div>404 Not Found</div>} />
    </Routes>
  );
}