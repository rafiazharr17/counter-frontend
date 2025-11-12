import React, { useState } from "react";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { useNavigate } from "react-router-dom";
import "primeicons/primeicons.css";

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      setError("Semua field wajib diisi!");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password tidak cocok!");
      return;
    }

    setError("");
    alert("Registrasi berhasil! Silakan login.");
    navigate("/login");
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="px-6 py-3 w-full max-w-md bg-white shadow-lg rounded-3xl border-2 border-sky-900/60">
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
        <form onSubmit={handleRegister} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sky-900/80 mb-1 font-medium">
              Full Name
            </label>
            <InputText
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full p-3 border-round-md"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sky-900/80 mb-1 font-medium">
              Email
            </label>
            <InputText
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full p-3 border-round-md"
            />
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

          {/* Confirm Password */}
          <div>
            <label className="block text-sky-900/80 mb-1 font-medium">
              Confirm Password
            </label>
            <Password
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              feedback={false}
              className="w-full"
              inputClassName="w-full p-3 border-round-md"
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-sm font-medium text-center">
              {error}
            </p>
          )}

          {/* Button */}
          <button
            type="submit"
            className="w-full bg-sky-900 hover:bg-sky-900/60 text-white text-lg font-semibold rounded-xl py-3 mt-3 transition-all duration-200"
          >
            Register
          </button>

          {/* Back to Login */}
          <p className="text-center text-sm text-gray-600 mt-4">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-sky-900 font-semibold hover:text-sky-900/80 transition"
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
