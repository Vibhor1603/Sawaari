import { useState } from "react";

export default function SignUpForm({
  userinfo,
  handleInput,
  handleSubmit,
  isSubmitting,
  error,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, text: "", color: "" };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++; // Match backend special characters

    const levels = [
      { text: "Very Weak", color: "#dc3545" },
      { text: "Weak", color: "#fd7e14" },
      { text: "Fair", color: "#ffc107" },
      { text: "Good", color: "#20c997" },
      { text: "Strong", color: "#198754" },
    ];

    return { strength, ...(levels[strength - 1] || levels[0]) };
  };

  const passwordStrength = getPasswordStrength(userinfo.password);

  return (
    <div className="glass-strong rounded-2xl p-6 border border-white/20 shadow-2xl">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-2xl">👤</span>
          <h2 className="text-2xl font-bold text-white">Join SAWAARI</h2>
          <span className="text-2xl">🛺</span>
        </div>
        <p className="text-gray-200 text-sm">
          Create your account and start your journey
        </p>
      </div>

      <form
        method="POST"
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4"
      >
        {/* Name and Email Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-sawaari-yellow mb-1"
            >
              👤 Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Your full name"
              value={userinfo.name}
              onChange={handleInput}
              required
              autoComplete="name"
              disabled={isSubmitting}
              className="form-input h-10"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-sawaari-yellow mb-1"
            >
              📧 Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Your email"
              value={userinfo.email}
              onChange={handleInput}
              required
              autoComplete="email"
              disabled={isSubmitting}
              className="form-input h-10"
            />
          </div>
        </div>

        {/* Phone Field */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-sawaari-yellow mb-1"
          >
            📱 Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            placeholder="10-digit mobile number"
            value={userinfo.phone || ""}
            onChange={handleInput}
            required
            autoComplete="tel"
            disabled={isSubmitting}
            maxLength="10"
            pattern="[6-9][0-9]{9}"
            className="form-input h-10"
          />
        </div>

        {/* Password Fields Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                placeholder="Create password"
                value={userinfo.password}
                onChange={handleInput}
                required
                autoComplete="new-password"
                disabled={isSubmitting}
                className="form-input h-10 pr-10"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                disabled={isSubmitting}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-sawaari-yellow transition-colors duration-300"
              >
                <span className="text-sm">{showPassword ? "👁️‍🗨️" : "👁️"}</span>
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-sawaari-yellow mb-1"
            >
              🔒 Confirm
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirm password"
                value={userinfo.confirmPassword}
                onChange={handleInput}
                required
                autoComplete="new-password"
                disabled={isSubmitting}
                className="form-input h-10 pr-10"
              />
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                disabled={isSubmitting}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-sawaari-yellow transition-colors duration-300"
              >
                <span className="text-sm">
                  {showConfirmPassword ? "👁️‍🗨️" : "👁️"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Password Requirements & Match Status */}
        <div className="text-xs text-gray-200 space-y-1">
          <p>
            Password: 8+ chars, uppercase, lowercase, number, special (@$!%*?&)
          </p>
          {userinfo.confirmPassword && (
            <p
              className={
                userinfo.password === userinfo.confirmPassword
                  ? "text-green-400"
                  : "text-red-400"
              }
            >
              {userinfo.password === userinfo.confirmPassword
                ? "✅ Passwords match"
                : "❌ Passwords don't match"}
            </p>
          )}
        </div>

        {/* Terms and Conditions */}
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="agreeTerms"
            name="agreeTerms"
            checked={userinfo.agreeTerms}
            onChange={handleInput}
            required
            disabled={isSubmitting}
            className="mt-1 w-4 h-4 text-sawaari-yellow bg-transparent border-2 border-white/20 rounded focus:ring-sawaari-yellow focus:ring-2"
          />
          <label htmlFor="agreeTerms" className="text-xs text-gray-200">
            I agree to the{" "}
            <a
              href="/terms"
              className="text-sawaari-yellow hover:text-white transition-colors duration-300"
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              className="text-sawaari-yellow hover:text-white transition-colors duration-300"
            >
              Privacy Policy
            </a>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            isSubmitting ||
            !userinfo.name ||
            !userinfo.email ||
            !userinfo.phone ||
            !userinfo.password ||
            !userinfo.confirmPassword ||
            !userinfo.agreeTerms ||
            userinfo.password !== userinfo.confirmPassword
          }
          className={`btn-primary w-full h-11 ${
            isSubmitting ||
            !userinfo.name ||
            !userinfo.email ||
            !userinfo.phone ||
            !userinfo.password ||
            !userinfo.confirmPassword ||
            !userinfo.agreeTerms ||
            userinfo.password !== userinfo.confirmPassword
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Creating Account...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>👤</span>
              <span>Create SAWAARI Account</span>
            </div>
          )}
        </button>

        {/* Sign In Link */}
        <div className="text-center text-sm">
          <span className="text-gray-200">Already have an account? </span>
          <a
            href="/signin"
            className="text-sawaari-yellow hover:text-white transition-colors duration-300"
          >
            Sign In
          </a>
        </div>
      </form>
    </div>
  );
}
