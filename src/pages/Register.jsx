import React, { useState } from "react";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { useNavigate } from "react-router-dom";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validasi field kosong
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Semua field wajib diisi!");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Password tidak cocok!");
      setLoading(false);
      return;
    }

    // Simulasi proses registrasi
    setTimeout(() => {
      setError("");
      alert("Registrasi berhasil! Silakan login.");
      navigate("/login");
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="px-6 py-2 w-full max-w-md bg-white shadow-lg rounded-3xl border-t-4 border-sky-900/60">
        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src="/mpp.png"
            alt="Logo"
            className="mx-auto mb-4"
            style={{ width: "70px" }}
          />
        </div>

        {/* Greeting */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-sky-900/80 mb-1">
            Create Account
          </h2>
          <p className="text-gray-500 text-sm">
            Please fill in the information below
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-5">
          {/* Full Name Field */}
          <div className="space-y-2">
            <label className="block text-sky-900/80 font-medium text-sm">
              Full Name
            </label>
            <div className="p-inputgroup border-1 border-gray-300 rounded-lg overflow-hidden focus-within:border-sky-900 transition-colors duration-200">
              <span className="p-inputgroup-addon bg-gray-50 border-0">
                <i className="pi pi-user text-sky-900/60"></i>
              </span>
              <InputText
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full p-3 border-0 focus:shadow-none"
                disabled={loading}
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label className="block text-sky-900/80 font-medium text-sm">
              Email
            </label>
            <div className="p-inputgroup border-1 border-gray-300 rounded-lg overflow-hidden focus-within:border-sky-900 transition-colors duration-200">
              <span className="p-inputgroup-addon bg-gray-50 border-0">
                <i className="pi pi-envelope text-sky-900/60"></i>
              </span>
              <InputText
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full p-3 border-0 focus:shadow-none"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="block text-sky-900/80 font-medium text-sm">
              Password
            </label>
            <div className="p-inputgroup border-1 border-gray-300 rounded-lg overflow-hidden focus-within:border-sky-900 transition-colors duration-200">
              <span className="p-inputgroup-addon bg-gray-50 border-0">
                <i className="pi pi-lock text-sky-900/60"></i>
              </span>
              <Password
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                feedback={false}
                className="w-full border-0"
                inputClassName="w-full p-3 border-0 focus:shadow-none"
                disabled={loading}
              />
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <label className="block text-sky-900/80 font-medium text-sm">
              Confirm Password
            </label>
            <div className="p-inputgroup border-1 border-gray-300 rounded-lg overflow-hidden focus-within:border-sky-900 transition-colors duration-200">
              <span className="p-inputgroup-addon bg-gray-50 border-0">
                <i className="pi pi-lock text-sky-900/60"></i>
              </span>
              <Password
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                feedback={false}
                className="w-full border-0"
                inputClassName="w-full p-3 border-0 focus:shadow-none"
                disabled={loading}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-medium text-center flex items-center justify-center gap-2">
                <i className="pi pi-exclamation-triangle"></i>
                {error}
              </p>
            </div>
          )}

          {/* Register Button */}
          <Button
            type="submit"
            label="Register"
            loading={loading}
            disabled={!name || !email || !password || !confirmPassword || loading}
            className="w-full bg-sky-900 hover:bg-sky-800 border-sky-900 text-white text-lg font-semibold rounded-xl py-3 mt-2 transition-all duration-200 shadow-md hover:shadow-lg"
          />

          {/* Back to Login Link */}
          <p className="text-center text-sm text-gray-600 mt-4">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-sky-900/80 font-semibold hover:text-sky-900 transition hover:underline"
            >
              Login
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;