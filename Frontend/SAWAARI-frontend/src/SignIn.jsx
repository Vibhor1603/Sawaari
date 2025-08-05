import SigninForm from "./SigninForm";
import { useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";
import FloatingRickshaws from "./components/FloatingRickshaws";

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
      const errorMsg = "🛺 Email is required to hop on!";
      setLocalError(errorMsg);
      toast.error(errorMsg);
      return false;
    }

    if (!email.includes("@")) {
      const errorMsg = "🛺 Please enter a valid email address";
      setLocalError(errorMsg);
      toast.error(errorMsg);
      return false;
    }

    if (!password) {
      const errorMsg = "🛺 Password is required for your ride";
      setLocalError(errorMsg);
      toast.error(errorMsg);
      return false;
    }

    if (password.length < 6) {
      const errorMsg = "🛺 Password must be at least 6 characters long";
      setLocalError(errorMsg);
      toast.error(errorMsg);
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
        toast.success("🛺 Welcome aboard! Login successful");
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      } else {
        console.log("❌ SignIn: Login failed:", result.error);
        const errorMsg = `🛺 ${
          result.error || "Login failed. Please check your credentials."
        }`;
        setLocalError(errorMsg);
        toast.error(errorMsg);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-dark via-secondary-dark to-tertiary-dark pt-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Checking authentication...</p>
        </div>
      </div>
    );
  }

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-black pt-16 flex items-center justify-center p-4 relative">
      <FloatingRickshaws />
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[10%] text-2xl opacity-10 animate-float">
          🔐
        </div>
        <div
          className="absolute top-[30%] right-[15%] text-2xl opacity-10 animate-float"
          style={{ animationDelay: "1s" }}
        >
          🛺
        </div>
        <div
          className="absolute bottom-[25%] left-[20%] text-2xl opacity-10 animate-float"
          style={{ animationDelay: "2s" }}
        >
          👤
        </div>
        <div
          className="absolute bottom-[35%] right-[25%] text-2xl opacity-10 animate-float"
          style={{ animationDelay: "3s" }}
        >
          🚀
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Error Alert */}
        {displayError && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 flex items-center gap-2 text-sm">
            <span>⚠️</span>
            <span>{displayError}</span>
          </div>
        )}

        <SigninForm
          userinfo={userinfo}
          handleInput={handleInput}
          handleSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          error={displayError}
        />
      </div>
    </div>
  );
}
