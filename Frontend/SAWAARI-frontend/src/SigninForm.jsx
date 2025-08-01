import { useState } from "react";

export default function Signinform({
  userinfo,
  handleInput,
  handleSubmit,
  isSubmitting,
  error,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="glass-strong rounded-2xl p-6 border border-white/20 shadow-2xl">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-2xl">🔐</span>
          <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
          <span className="text-2xl">🛺</span>
        </div>
        <p className="text-gray-200 text-sm">Sign in to your SAWAARI account</p>
      </div>

      <form
        method="POST"
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4"
      >
        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-sawaari-yellow mb-1"
          >
            📧 Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email address"
            value={userinfo.email}
            onChange={handleInput}
            required
            autoComplete="email"
            disabled={isSubmitting}
            className="form-input h-11"
          />
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-sawaari-yellow mb-1"
          >
            🔒 Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              placeholder="Enter your password"
              value={userinfo.password}
              onChange={handleInput}
              required
              autoComplete="current-password"
              disabled={isSubmitting}
              className="form-input h-11 pr-12"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              disabled={isSubmitting}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-sawaari-yellow transition-colors duration-300 disabled:opacity-50"
            >
              <span className="text-sm">{showPassword ? "👁️‍🗨️" : "👁️"}</span>
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !userinfo.email || !userinfo.password}
          className={`btn-primary w-full h-11 ${
            isSubmitting || !userinfo.email || !userinfo.password
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Signing In...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>🔐</span>
              <span>Sign In to SAWAARI</span>
            </div>
          )}
        </button>

        {/* Links */}
        <div className="flex justify-between items-center text-sm pt-2">
          <a
            href="/forgot-password"
            className="text-sawaari-yellow hover:text-white transition-colors duration-300"
          >
            Forgot Password?
          </a>
          <a
            href="/signup"
            className="text-sawaari-yellow hover:text-white transition-colors duration-300"
          >
            Sign Up
          </a>
        </div>
      </form>
    </div>
  );
}
