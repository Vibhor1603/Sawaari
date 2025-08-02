import { useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { useAuthModal } from "../contexts/AuthModalContext";
import AuthModal from "./AuthModal";
import authService from "../services/authService";
import toast from "../utils/toast";

export default function AuthModalContainer() {
  const { isModalOpen, modalMode, closeModal, switchMode } = useAuthModal();
  const { login, isAuthenticated, isLoading, error, clearError } =
    useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Signin state
  const [signinInfo, setSigninInfo] = useState({
    email: "",
    password: "",
  });
  const [isSigninSubmitting, setIsSigninSubmitting] = useState(false);
  const [signinError, setSigninError] = useState(null);

  // Signup state
  const [signupInfo, setSignupInfo] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });
  const [isSignupSubmitting, setIsSignupSubmitting] = useState(false);
  const [signupError, setSignupError] = useState(null);
  const [signupSuccessMessage, setSignupSuccessMessage] = useState(null);

  // Close modal if user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      closeModal();
    }
  }, [isAuthenticated, isLoading, closeModal]);

  // Clear errors when modal opens/closes or mode switches
  useEffect(() => {
    if (isModalOpen) {
      clearError();
      setSigninError(null);
      setSignupError(null);
      setSignupSuccessMessage(null);
    }
  }, [isModalOpen, modalMode, clearError]);

  // Signin handlers
  const handleSigninInput = (event) => {
    const { name, value } = event.target;
    setSigninInfo((prev) => ({ ...prev, [name]: value }));

    if (signinError) setSigninError(null);
    if (error) clearError();
  };

  const validateSigninForm = () => {
    const { email, password } = signinInfo;

    if (!email.trim()) {
      const errorMsg = "🛺 Email is required to hop on!";
      setSigninError(errorMsg);
      toast.error(errorMsg);
      return false;
    }

    if (!email.includes("@")) {
      const errorMsg = "🛺 Please enter a valid email address";
      setSigninError(errorMsg);
      toast.error(errorMsg);
      return false;
    }

    if (!password) {
      const errorMsg = "🛺 Password is required for your ride";
      setSigninError(errorMsg);
      toast.error(errorMsg);
      return false;
    }

    if (password.length < 6) {
      const errorMsg = "🛺 Password must be at least 6 characters long";
      setSigninError(errorMsg);
      toast.error(errorMsg);
      return false;
    }

    return true;
  };

  const handleSigninSubmit = async (event) => {
    event.preventDefault();

    if (!validateSigninForm()) {
      return;
    }

    setIsSigninSubmitting(true);
    setSigninError(null);

    try {
      const result = await login({
        email: signinInfo.email.trim().toLowerCase(),
        password: signinInfo.password,
      });

      if (result.success) {
        toast.success("🛺 Welcome aboard! Login successful");
        closeModal();
        // Reset form
        setSigninInfo({ email: "", password: "" });
      } else {
        const errorMsg = `🛺 ${
          result.error || "Login failed. Please check your credentials."
        }`;
        setSigninError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("🚨 SignIn: Catch block error:", error);
      setSigninError(
        "Network error. Please check your connection and try again."
      );
    } finally {
      setIsSigninSubmitting(false);
    }
  };

  // Signup handlers
  const handleSignupInput = (event) => {
    const { name, value, type, checked } = event.target;
    const inputValue = type === "checkbox" ? checked : value;

    setSignupInfo((prev) => ({ ...prev, [name]: inputValue }));

    if (signupError) setSignupError(null);
    if (signupSuccessMessage) setSignupSuccessMessage(null);
  };

  const validateSignupForm = () => {
    const { name, email, phone, password, confirmPassword, agreeTerms } =
      signupInfo;

    if (!name.trim()) {
      setSignupError("Full name is required");
      return false;
    }

    if (name.trim().length < 2) {
      setSignupError("Name must be at least 2 characters long");
      return false;
    }

    if (!email.trim()) {
      setSignupError("Email is required");
      return false;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setSignupError("Please enter a valid email address");
      return false;
    }

    if (!phone.trim()) {
      setSignupError("Phone number is required");
      return false;
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setSignupError(
        "Please enter a valid 10-digit Indian mobile number starting with 6-9"
      );
      return false;
    }

    if (!password) {
      setSignupError("Password is required");
      return false;
    }

    if (password.length < 8) {
      setSignupError("Password must be at least 8 characters long");
      return false;
    }

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[@$!%*?&]/.test(password);

    if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
      setSignupError(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
      );
      return false;
    }

    if (!confirmPassword) {
      setSignupError("Please confirm your password");
      return false;
    }

    if (password !== confirmPassword) {
      setSignupError("Passwords do not match");
      return false;
    }

    if (!agreeTerms) {
      setSignupError(
        "You must agree to the Terms of Service and Privacy Policy"
      );
      return false;
    }

    return true;
  };

  const handleSignupSubmit = async (event) => {
    event.preventDefault();

    if (!validateSignupForm()) {
      return;
    }

    setIsSignupSubmitting(true);
    setSignupError(null);
    setSignupSuccessMessage(null);

    try {
      const result = await authService.register({
        name: signupInfo.name.trim(),
        email: signupInfo.email.trim().toLowerCase(),
        phone: signupInfo.phone.trim(),
        password: signupInfo.password,
        confirmPassword: signupInfo.confirmPassword,
      });

      if (result.success) {
        setSignupSuccessMessage(
          "Account created successfully! You can now sign in with your credentials."
        );
        toast.success("🛺 Account created successfully!");

        // Reset form
        setSignupInfo({
          name: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          agreeTerms: false,
        });

        // Switch to signin modal after 2 seconds
        setTimeout(() => {
          setSignupSuccessMessage(null);
          switchMode("signin");
          // Pre-fill email in signin form
          setSigninInfo((prev) => ({
            ...prev,
            email: signupInfo.email.trim().toLowerCase(),
          }));
        }, 2000);
      } else {
        setSignupError(
          result.error || "Registration failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Registration error:", error);
      setSignupError(
        "Network error. Please check your connection and try again."
      );
    } finally {
      setIsSignupSubmitting(false);
    }
  };

  const signinProps = {
    userinfo: signinInfo,
    handleInput: handleSigninInput,
    handleSubmit: handleSigninSubmit,
    isSubmitting: isSigninSubmitting,
    error: signinError || error,
  };

  const signupProps = {
    userinfo: signupInfo,
    handleInput: handleSignupInput,
    handleSubmit: handleSignupSubmit,
    isSubmitting: isSignupSubmitting,
    error: signupError,
    successMessage: signupSuccessMessage,
  };

  return (
    <AuthModal
      isOpen={isModalOpen}
      onClose={closeModal}
      mode={modalMode}
      onSwitchMode={switchMode}
      signinProps={signinProps}
      signupProps={signupProps}
    />
  );
}
