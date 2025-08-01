import SignUpForm from "./SignUpForm";
import { useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import authService from "./services/authService";

export default function SignUp() {
  const [userinfo, setUserinfo] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, clearError } = useContext(AuthContext);

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
    const { name, value, type, checked } = event.target;
    const inputValue = type === "checkbox" ? checked : value;

    setUserinfo((prev) => ({ ...prev, [name]: inputValue }));

    // Clear errors when user starts typing
    if (localError) setLocalError(null);
    if (successMessage) setSuccessMessage(null);
  };

  const validateForm = () => {
    const { name, email, phone, password, confirmPassword, agreeTerms } =
      userinfo;

    if (!name.trim()) {
      setLocalError("Full name is required");
      return false;
    }

    if (name.trim().length < 2) {
      setLocalError("Name must be at least 2 characters long");
      return false;
    }

    if (!email.trim()) {
      setLocalError("Email is required");
      return false;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setLocalError("Please enter a valid email address");
      return false;
    }

    if (!phone.trim()) {
      setLocalError("Phone number is required");
      return false;
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setLocalError(
        "Please enter a valid 10-digit Indian mobile number starting with 6-9"
      );
      return false;
    }

    if (!password) {
      setLocalError("Password is required");
      return false;
    }

    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters long");
      return false;
    }

    // Password strength validation to match backend requirements
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[@$!%*?&]/.test(password);

    if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
      setLocalError(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
      );
      return false;
    }

    if (!confirmPassword) {
      setLocalError("Please confirm your password");
      return false;
    }

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return false;
    }

    if (!agreeTerms) {
      setLocalError(
        "You must agree to the Terms of Service and Privacy Policy"
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);
    setSuccessMessage(null);

    try {
      const result = await authService.register({
        name: userinfo.name.trim(),
        email: userinfo.email.trim().toLowerCase(),
        phone: userinfo.phone.trim(),
        password: userinfo.password,
        confirmPassword: userinfo.confirmPassword,
      });

      if (result.success) {
        setSuccessMessage(
          "Account created successfully! You can now sign in with your credentials."
        );

        // Clear form
        setUserinfo({
          name: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          agreeTerms: false,
        });

        // Redirect to signin after 2 seconds
        setTimeout(() => {
          navigate("/signin", {
            state: {
              message: "Account created successfully! Please sign in.",
              email: userinfo.email.trim().toLowerCase(),
            },
          });
        }, 2000);
      } else {
        setLocalError(result.error || "Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Registration error:", error);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-dark via-secondary-dark to-tertiary-dark pt-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-16 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[15%] left-[8%] text-2xl opacity-10 animate-float">
          👤
        </div>
        <div
          className="absolute top-[25%] right-[12%] text-2xl opacity-10 animate-float"
          style={{ animationDelay: "1s" }}
        >
          📝
        </div>
        <div
          className="absolute bottom-[20%] left-[15%] text-2xl opacity-10 animate-float"
          style={{ animationDelay: "2s" }}
        >
          🛺
        </div>
        <div
          className="absolute bottom-[30%] right-[20%] text-2xl opacity-10 animate-float"
          style={{ animationDelay: "3s" }}
        >
          🚀
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 flex items-center gap-2 text-sm">
            <span>✅</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {localError && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 flex items-center gap-2 text-sm">
            <span>⚠️</span>
            <span>{localError}</span>
          </div>
        )}

        <SignUpForm
          userinfo={userinfo}
          handleInput={handleInput}
          handleSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          error={localError}
        />
      </div>
    </div>
  );
}
