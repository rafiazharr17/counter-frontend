import React, { useState } from "react";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { useNavigate } from "react-router-dom";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validasi field kosong
    if (!email.trim() || !password.trim()) {
      setError("Email dan Password Harus Diisi");
      setLoading(false);
      return;
    }

    // Simulasi proses login
    setTimeout(() => {
      if (email === "admin@mpp.com" && password === "12345") {
        navigate("/admin");
      } else {
        setError("Email atau password salah!");
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="p-8 w-full max-w-md bg-white shadow-lg rounded-3xl border-t-4 border-sky-900/60">
        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src="/mpp.png"
            alt="Logo"
            className="mx-auto mb-4"
            style={{ width: "70px" }}
          />
        </div>

        {/* Avatar + Greeting */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-sky-900/80 mb-1">
            Welcome, User!
          </h2>
          <p className="text-gray-500 text-sm">Sign in to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
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
                placeholder="Masukkan email address"
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
                placeholder="Masukkan password"
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

          {/* Remember + Forgot - CUSTOM STYLE CHECKBOX */}
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 border-2 rounded-md flex items-center justify-center cursor-pointer transition-all duration-200 ${
                  checked
                    ? "bg-sky-900 border-sky-900"
                    : "border-sky-900/60 bg-white"
                }`}
                onClick={() => setChecked(!checked)}
              >
                {checked && (
                  <i className="pi pi-check text-white text-xs font-bold"></i>
                )}
              </div>
              <label
                className="text-sky-900/80 cursor-pointer font-medium text-sm"
                onClick={() => setChecked(!checked)}
              >
                Remember me
              </label>
            </div>
            <a
              href="#"
              className="font-medium text-sky-900/80 hover:text-sky-900 transition hover:underline"
            >
              Forgot password?
            </a>
          </div>

          {/* Login Button */}
          <Button
            type="submit"
            label="Sign In"
            loading={loading}
            disabled={!email || !password || loading}
            className="w-full bg-sky-900 hover:bg-sky-800 border-sky-900 text-white text-lg font-semibold rounded-xl py-3 mt-2 transition-all duration-200 shadow-md hover:shadow-lg"
          />

          {/* Register Link */}
          <p className="text-center text-sm text-gray-600 mt-4">
            Don't have an account?{" "}
            <a
              href="/register"
              className="text-sky-900/80 font-semibold hover:text-sky-900 transition hover:underline"
            >
              Register
            </a>
          </p>

          {/* Guest Link */}
          <p className="text-center text-sm text-gray-600 mt-4">
            Are you a guest?{" "}
            <a
              href="/ambil-antrean"
              className="text-sky-900/80 font-semibold hover:text-sky-900 transition hover:underline"
            >
              Yes
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
