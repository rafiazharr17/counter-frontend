import React, { useState, useEffect } from "react";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { useNavigate } from "react-router-dom";
import { useLoginMutation } from "../features/auth/authApi";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [login, { isLoading }] = useLoginMutation();

  // Load saved credentials when component mounts
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    const rememberMe = localStorage.getItem("rememberMe") === "true";

    if (rememberMe && savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setChecked(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email dan Password Harus Diisi");
      return;
    }

    try {
      const res = await login({ email, password }).unwrap();
      console.log("Login success:", res);

      // Handle remember me functionality
      if (checked) {
        // Save credentials to localStorage
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberedPassword", password);
        localStorage.setItem("rememberMe", "true");
      } else {
        // Clear saved credentials
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
        localStorage.removeItem("rememberMe");
      }

      // Simpan token & user sudah otomatis di authApi.js

      // Arahkan sesuai role
      if (res.user?.role?.name === "admin") {
        navigate("/admin");
      } else if (res.user?.role?.name === "customer_service") {
        navigate("/cs");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err?.data?.message || "Email atau password salah!");
    }
  };

  // Handle checkbox change
  const handleCheckboxChange = () => {
    const newChecked = !checked;
    setChecked(newChecked);
    
    // If unchecking, also clear the saved credentials
    if (!newChecked) {
      localStorage.removeItem("rememberedEmail");
      localStorage.removeItem("rememberedPassword");
      localStorage.removeItem("rememberMe");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 px-4">
      <div className="p-6 w-full max-w-md bg-white shadow-lg rounded-3xl border-t-4 border-sky-900/60">
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
            Selamat Datang!
          </h2>
          <p className="text-gray-500 text-sm">Mall Pelayanan Publik</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
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
                placeholder="Masukkan alamat email"
                className="w-full p-3 border-0 focus:shadow-none"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password */}
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
                placeholder="Masukkan password"
                feedback={false}
                className="w-full border-0"
                inputClassName="w-full p-3 border-0 focus:shadow-none"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-medium text-center flex items-center justify-center gap-2">
                <i className="pi pi-exclamation-triangle"></i>
                {error}
              </p>
            </div>
          )}

          {/* Remember + Forgot */}
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 border-2 rounded-md flex items-center justify-center cursor-pointer transition-all duration-200 ${
                  checked
                    ? "bg-sky-900 border-sky-900"
                    : "border-sky-900/60 bg-white"
                }`}
                onClick={handleCheckboxChange}>
                {checked && (
                  <i className="pi pi-check text-white text-xs font-bold"></i>
                )}
              </div>
              <label
                className="text-sky-900/80 cursor-pointer font-medium text-sm"
                onClick={handleCheckboxChange}>
                Ingat Saya
              </label>
            </div>
            <a
              href="#"
              className="font-medium text-sky-900/80 hover:text-sky-900 transition hover:underline">
              Lupa password?
            </a>
          </div>

          {/* Button */}
          <Button
            type="submit"
            label={isLoading ? "Loading..." : "Masuk"}
            loading={isLoading}
            disabled={!email || !password || isLoading}
            className="w-full bg-sky-900 hover:bg-sky-800 border-sky-900 text-white text-lg font-semibold rounded-xl py-3 mt-2 transition-all duration-200 shadow-md hover:shadow-lg"
          />

          {/* Register */}
          <p className="text-center text-sm text-gray-600 mt-4">
            Apakah anda belum memiliki akun?{" "}
            <a
              href="/register"
              className="text-sky-900/80 font-semibold hover:text-sky-900 transition hover:underline">
              Daftar
            </a>
          </p>

          {/* Guest Link */}
          <p className="text-center text-sm text-gray-600 mt-4">
            Apakah anda sebagai tamu?{" "}
            <a
              href="/ambil-antrean"
              className="text-sky-900/80 font-semibold hover:text-sky-900 transition hover:underline">
              Ya
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;