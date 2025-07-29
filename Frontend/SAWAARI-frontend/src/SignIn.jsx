import SigninForm from "./SigninForm";
import { useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export default function SignIn() {
  const [userinfo, setUserinfo] = useState({
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, error, clearError } =
    useContext(AuthContext);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  // Clear errors when component mounts or user starts typing
  useEffect(() => {
    clearError();
    setLocalError(null);
  }, [clearError]);

  const handleInput = (event) => {
    const { name, value } = event.target;
    setUserinfo((prev) => ({ ...prev, [name]: value }));

    // Clear errors when user starts typing
    if (localError) setLocalError(null);
    if (error) clearError();
  };

  const validateForm = () => {
    const { email, password } = userinfo;

    if (!email.trim()) {
      setLocalError("Email is required");
      return false;
    }

    if (!email.includes("@")) {
      setLocalError("Please enter a valid email address");
      return false;
    }

    if (!password) {
      setLocalError("Password is required");
      return false;
    }

    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters long");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    console.log("🔐 SignIn: Form submitted");

    if (!validateForm()) {
      console.log("❌ SignIn: Form validation failed");
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);

    console.log("🔐 SignIn: Attempting login with:", {
      email: userinfo.email.trim().toLowerCase(),
      password: "***hidden***",
    });

    try {
      const result = await login({
        email: userinfo.email.trim().toLowerCase(),
        password: userinfo.password,
      });

      console.log("🔐 SignIn: Login result:", result);

      if (result.success) {
        console.log("✅ SignIn: Login successful, navigating...");
        // Navigation will be handled by the useEffect above
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      } else {
        console.log("❌ SignIn: Login failed:", result.error);
        setLocalError(
          result.error || "Login failed. Please check your credentials."
        );
      }
    } catch (error) {
      console.error("🚨 SignIn: Catch block error:", error);
      setLocalError(
        "Network error. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div
        className="container d-flex justify-content-center align-items-center"
        style={{ minHeight: "50vh" }}
      >
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3" style={{ color: "var(--text-secondary)" }}>
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  const displayError = localError || error;

  return (
    <>
      {displayError && (
        <div className="container mt-4">
          <div
            className="alert alert-danger"
            style={{
              background: "var(--tertiary-dark)",
              border: "1px solid #dc3545",
              color: "var(--text-primary)",
              maxWidth: "500px",
              margin: "0 auto",
            }}
          >
            <i className="fas fa-exclamation-triangle me-2"></i>
            {displayError}
          </div>
        </div>
      )}

      <SigninForm
        userinfo={userinfo}
        handleInput={handleInput}
        handleSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        error={displayError}
      />
    </>
  );
}
