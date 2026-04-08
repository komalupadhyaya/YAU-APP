import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "../../assets/brand_logo.png";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(formData.email, formData.password);
      navigate("/"); // Redirect to dashboard after successful login
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div>
        <div className="flex justify-between items-center px-1">
          <h1 className="text-3xl font-bold text-center text-blue-950">
            <motion.span
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="block"
            >
              <img
                src={logo}
                alt="Logo"
                className="h-12 w-auto scale-x-150 scale-y-150 transform"
              />
            </motion.span>
          </h1>
          <button
            onClick={() => navigate("/register")}
            className="text-blue-600 font-medium hover:underline"
          >
            Sign Up
          </button>
        </div>

        <div className="flex flex-col sm:flex-row w-full max-w-5xl bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Left Panel */}
          <div className="sm:w-1/2 w-full bg-blue-600 text-white flex flex-col justify-center p-10 sm:p-20">
            <h2 className="text-3xl mb-4">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="block"
              >
                Stay Connected..
              </motion.span>
            </h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="text-lg sm:text-xl"
            >
              Access your student’s team info, get important messages and game day updates, view schedules, and manage membership details — all in one place.
            </motion.p>
          </div>

          {/* Right Panel */}
          <div className="sm:w-1/2 w-full p-8 sm:p-16 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Welcome back</h2>
              </div>

              <p className="mb-6 text-gray-600">
                Log in to manage your membership in one place
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex justify-between items-center text-sm">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      className="h-4 w-4"
                      disabled={loading}
                    />
                    <span className={loading ? "text-gray-400" : ""}>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => !loading && navigate("/forgot-password")}
                    disabled={loading}
                    className={`${loading ? "text-gray-400 cursor-not-allowed" : "text-blue-600 hover:underline"}`}
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Logging in..." : "Log in"}
                </button>
              </form>
            </div>

            {/* Bottom: Footer Links */}
            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center text-gray-500 text-sm">
              <p className="mt-4 sm:mt-0 text-center sm:text-left">
                Don't have an account?{" "}
                <button
                  onClick={() => navigate("/register")}
                  className="text-blue-600 font-medium hover:underline"
                >
                  Sign Up
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Footer outside card */}
        <div className="flex space-x-4 mt-4 sm:mt-0 justify-start px-2 text-gray-500 text-sm">
          <a href="/terms" className="hover:underline">Terms</a>
          <a href="/privacy" className="hover:underline">Privacy</a>
          <a href="/contact" className="hover:underline">Contact</a>
        </div>
      </div>
    </div>
  );
}