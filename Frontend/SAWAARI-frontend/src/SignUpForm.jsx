/* eslint-disable react/prop-types */
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
    <div className="container signup">
      <div className="text-center mb-4">
        <h2 className="headings">Join SAWAARI</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Create your account and start your smart travel journey
        </p>
      </div>

      <form method="POST" onSubmit={handleSubmit} noValidate>
        {/* Name Field */}
        <div className="mb-3">
          <label
            htmlFor="name"
            className="form-label"
            style={{ color: "var(--text-secondary)", fontWeight: "600" }}
          >
            Full Name
          </label>
          <div className="input-group">
            <span
              className="input-group-text"
              style={{
                background: "var(--tertiary-dark)",
                border: "2px solid var(--border-color)",
                color: "var(--accent-green)",
              }}
            >
              <i className="fas fa-user"></i>
            </span>
            <input
              type="text"
              className="form-control"
              id="name"
              name="name"
              placeholder="Enter your full name"
              value={userinfo.name}
              onChange={handleInput}
              required
              autoComplete="name"
              disabled={isSubmitting}
              style={{
                background: "var(--tertiary-dark)",
                border: "2px solid var(--border-color)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        {/* Email Field */}
        <div className="mb-3">
          <label
            htmlFor="email"
            className="form-label"
            style={{ color: "var(--text-secondary)", fontWeight: "600" }}
          >
            Email Address
          </label>
          <div className="input-group">
            <span
              className="input-group-text"
              style={{
                background: "var(--tertiary-dark)",
                border: "2px solid var(--border-color)",
                color: "var(--accent-green)",
              }}
            >
              <i className="fas fa-envelope"></i>
            </span>
            <input
              type="email"
              className="form-control"
              id="email"
              name="email"
              placeholder="Enter your email address"
              value={userinfo.email}
              onChange={handleInput}
              required
              autoComplete="email"
              disabled={isSubmitting}
              style={{
                background: "var(--tertiary-dark)",
                border: "2px solid var(--border-color)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        {/* Phone Number Field */}
        <div className="mb-3">
          <label
            htmlFor="phone"
            className="form-label"
            style={{ color: "var(--text-secondary)", fontWeight: "600" }}
          >
            Phone Number
          </label>
          <div className="input-group">
            <span
              className="input-group-text"
              style={{
                background: "var(--tertiary-dark)",
                border: "2px solid var(--border-color)",
                color: "var(--accent-green)",
              }}
            >
              <i className="fas fa-mobile-alt"></i>
            </span>
            <input
              type="tel"
              className="form-control"
              id="phone"
              name="phone"
              placeholder="Enter your 10-digit phone number"
              value={userinfo.phone || ""}
              onChange={handleInput}
              required
              autoComplete="tel"
              disabled={isSubmitting}
              maxLength="10"
              pattern="[6-9][0-9]{9}"
              style={{
                background: "var(--tertiary-dark)",
                border: "2px solid var(--border-color)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <small
            className="form-text"
            style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}
          >
            Enter a valid 10-digit Indian mobile number (starting with 6-9)
          </small>
        </div>

        {/* Password Field */}
        <div className="mb-3">
          <label
            htmlFor="password"
            className="form-label"
            style={{ color: "var(--text-secondary)", fontWeight: "600" }}
          >
            Password
          </label>
          <div className="input-group">
            <span
              className="input-group-text"
              style={{
                background: "var(--tertiary-dark)",
                border: "2px solid var(--border-color)",
                color: "var(--accent-green)",
              }}
            >
              <i className="fas fa-lock"></i>
            </span>
            <input
              type={showPassword ? "text" : "password"}
              className="form-control"
              id="password"
              name="password"
              placeholder="Create a strong password"
              value={userinfo.password}
              onChange={handleInput}
              required
              autoComplete="new-password"
              disabled={isSubmitting}
              style={{
                background: "var(--tertiary-dark)",
                border: "2px solid var(--border-color)",
                color: "var(--text-primary)",
              }}
            />
            <button
              type="button"
              className="btn"
              onClick={togglePasswordVisibility}
              disabled={isSubmitting}
              style={{
                background: "var(--tertiary-dark)",
                border: "2px solid var(--border-color)",
                color: "var(--text-secondary)",
              }}
            >
              <i
                className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
              ></i>
            </button>
          </div>

          {/* Password Requirements */}
          <div className="mt-2">
            <small
              style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}
            >
              Password must contain: 8+ characters, uppercase, lowercase,
              number, and special character (@$!%*?&)
            </small>
          </div>

          {/* Password Strength Indicator */}
          {userinfo.password && (
            <div className="mt-2">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <small style={{ color: "var(--text-secondary)" }}>
                  Password Strength:
                </small>
                <small
                  style={{ color: passwordStrength.color, fontWeight: "600" }}
                >
                  {passwordStrength.text}
                </small>
              </div>
              <div
                className="progress"
                style={{ height: "4px", background: "var(--border-color)" }}
              >
                <div
                  className="progress-bar"
                  style={{
                    width: `${(passwordStrength.strength / 5) * 100}%`,
                    backgroundColor: passwordStrength.color,
                    transition: "all 0.3s ease",
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="mb-4">
          <label
            htmlFor="confirmPassword"
            className="form-label"
            style={{ color: "var(--text-secondary)", fontWeight: "600" }}
          >
            Confirm Password
          </label>
          <div className="input-group">
            <span
              className="input-group-text"
              style={{
                background: "var(--tertiary-dark)",
                border: "2px solid var(--border-color)",
                color: "var(--accent-green)",
              }}
            >
              <i className="fas fa-lock"></i>
            </span>
            <input
              type={showConfirmPassword ? "text" : "password"}
              className="form-control"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={userinfo.confirmPassword}
              onChange={handleInput}
              required
              autoComplete="new-password"
              disabled={isSubmitting}
              style={{
                background: "var(--tertiary-dark)",
                border: "2px solid var(--border-color)",
                color: "var(--text-primary)",
              }}
            />
            <button
              type="button"
              className="btn"
              onClick={toggleConfirmPasswordVisibility}
              disabled={isSubmitting}
              style={{
                background: "var(--tertiary-dark)",
                border: "2px solid var(--border-color)",
                color: "var(--text-secondary)",
              }}
            >
              <i
                className={`fas ${
                  showConfirmPassword ? "fa-eye-slash" : "fa-eye"
                }`}
              ></i>
            </button>
          </div>

          {/* Password Match Indicator */}
          {userinfo.confirmPassword && (
            <div className="mt-2">
              {userinfo.password === userinfo.confirmPassword ? (
                <small style={{ color: "var(--accent-green)" }}>
                  <i className="fas fa-check me-1"></i>
                  Passwords match
                </small>
              ) : (
                <small style={{ color: "#dc3545" }}>
                  <i className="fas fa-times me-1"></i>
                  Passwords do not match
                </small>
              )}
            </div>
          )}
        </div>

        {/* Terms and Conditions */}
        <div className="mb-4">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="agreeTerms"
              name="agreeTerms"
              checked={userinfo.agreeTerms}
              onChange={handleInput}
              required
              disabled={isSubmitting}
              style={{
                backgroundColor: userinfo.agreeTerms
                  ? "var(--accent-green)"
                  : "transparent",
                borderColor: "var(--border-color)",
              }}
            />
            <label
              className="form-check-label"
              htmlFor="agreeTerms"
              style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}
            >
              I agree to the{" "}
              <a
                href="/terms"
                style={{ color: "var(--accent-green)", textDecoration: "none" }}
                onMouseOver={(e) =>
                  (e.target.style.textDecoration = "underline")
                }
                onMouseOut={(e) => (e.target.style.textDecoration = "none")}
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                style={{ color: "var(--accent-green)", textDecoration: "none" }}
                onMouseOver={(e) =>
                  (e.target.style.textDecoration = "underline")
                }
                onMouseOut={(e) => (e.target.style.textDecoration = "none")}
              >
                Privacy Policy
              </a>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="sign-btn"
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
          style={{
            opacity:
              isSubmitting ||
              !userinfo.name ||
              !userinfo.email ||
              !userinfo.phone ||
              !userinfo.password ||
              !userinfo.confirmPassword ||
              !userinfo.agreeTerms ||
              userinfo.password !== userinfo.confirmPassword
                ? 0.6
                : 1,
            cursor:
              isSubmitting ||
              !userinfo.name ||
              !userinfo.email ||
              !userinfo.phone ||
              !userinfo.password ||
              !userinfo.confirmPassword ||
              !userinfo.agreeTerms ||
              userinfo.password !== userinfo.confirmPassword
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isSubmitting ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              Creating Account...
            </>
          ) : (
            <>
              <i className="fas fa-user-plus me-2"></i>
              Create Account
            </>
          )}
        </button>

        <div className="text-center mt-4">
          <p style={{ color: "var(--text-secondary)" }}>
            Already have an account?{" "}
            <a
              href="/signin"
              style={{
                color: "var(--accent-green)",
                textDecoration: "none",
                fontWeight: "600",
              }}
              onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
              onMouseOut={(e) => (e.target.style.textDecoration = "none")}
            >
              Sign In
            </a>
          </p>
        </div>
      </form>

      {/* Security Features */}
      <div
        className="mt-4 p-3"
        style={{
          background: "var(--primary-dark)",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          fontSize: "0.9rem",
        }}
      >
        <div className="d-flex align-items-center mb-2">
          <i
            className="fas fa-shield-alt me-2"
            style={{ color: "var(--accent-green)" }}
          ></i>
          <strong style={{ color: "var(--accent-green)" }}>
            Your Data is Secure
          </strong>
        </div>
        <ul
          className="mb-0 ps-3"
          style={{ color: "var(--text-secondary)", lineHeight: "1.5" }}
        >
          <li>Passwords are encrypted with industry-standard security</li>
          <li>Your personal information is never shared with third parties</li>
          <li>All data transmission is secured with HTTPS encryption</li>
        </ul>
      </div>
    </div>
  );
}
