import React, { useState } from "react";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { useNavigate } from "react-router-dom";
import "primeicons/primeicons.css";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (email === "admin@mpp.com" && password === "12345") {
      setError("");
      navigate("/admin");
    } else {
      setError("Email atau password salah!");
    }
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
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sky-900/80 mb-1 font-medium">
              Email
            </label>
            <span className="p-input-icon-left w-full">
              <InputText
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full p-3 border-round-md"
              />
            </span>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sky-900/80 mb-1 font-medium">
              Password
            </label>
            <Password
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              feedback={false}
              className="w-full"
              inputClassName="w-full p-3 border-round-md"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-500 text-sm font-medium text-center">
              {error}
            </p>
          )}

          {/* Remember + Forgot */}
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <Checkbox
                inputId="remember"
                checked={checked}
                onChange={(e) => setChecked(e.checked ?? false)}
              />
              <label htmlFor="remember" className="text-sky-900/80">
                Remember me
              </label>
            </div>
            <a
              href="#"
              className="font-medium text-sky-900/80 hover:text-sky-900 transition"
            >
              Forgot password?
            </a>
          </div>

          {/* Button */}
          <button
            type="submit"
            className="w-full bg-sky-900 hover:bg-sky-900/60 text-white text-lg font-semibold rounded-xl py-3 mt-3 transition-all duration-200"
          >
            Sign In
          </button>

          {/* Register Link */}
          <p className="text-center text-sm text-gray-600 mt-4">
            Don’t have an account?{" "}
            <a
              href="/register"
              className="text-sky-900/80 font-semibold hover:text-sky-900 transition"
            >
              Register
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
