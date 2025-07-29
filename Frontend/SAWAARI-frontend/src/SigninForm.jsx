/* eslint-disable react/prop-types */
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
    <>
      <div className="container signup">
        <div className="text-center mb-4">
          <h2 className="headings">Welcome Back</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Sign in to your SAWAARI account
          </p>
        </div>

        <form method="POST" onSubmit={handleSubmit} noValidate>
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

          <div className="mb-4">
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
                placeholder="Enter your password"
                value={userinfo.password}
                onChange={handleInput}
                required
                autoComplete="current-password"
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
          </div>

          <button
            type="submit"
            className="sign-btn"
            disabled={isSubmitting || !userinfo.email || !userinfo.password}
            style={{
              opacity:
                isSubmitting || !userinfo.email || !userinfo.password ? 0.6 : 1,
              cursor:
                isSubmitting || !userinfo.email || !userinfo.password
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
                Signing In...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt me-2"></i>
                Sign In
              </>
            )}
          </button>

          <div className="text-center mt-3">
            <a
              href="/forgot-password"
              style={{
                color: "var(--accent-green)",
                textDecoration: "none",
                fontWeight: "500",
                fontSize: "14px",
              }}
              onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
              onMouseOut={(e) => (e.target.style.textDecoration = "none")}
            >
              <i className="fas fa-key me-1"></i>
              Forgot Password?
            </a>
          </div>

          <div className="text-center mt-4">
            <p style={{ color: "var(--text-secondary)" }}>
              Don't have an account?{" "}
              <a
                href="/signup"
                style={{
                  color: "var(--accent-green)",
                  textDecoration: "none",
                  fontWeight: "600",
                }}
                onMouseOver={(e) =>
                  (e.target.style.textDecoration = "underline")
                }
                onMouseOut={(e) => (e.target.style.textDecoration = "none")}
              >
                Sign Up
              </a>
            </p>
          </div>
        </form>

        {/* Security Notice */}
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
              Security Notice
            </strong>
          </div>
          <p
            className="mb-0"
            style={{ color: "var(--text-secondary)", lineHeight: "1.5" }}
          >
            Your account is protected with industry-standard security measures
            including encrypted passwords and secure JWT tokens.
          </p>
        </div>
      </div>
    </>
  );
}
