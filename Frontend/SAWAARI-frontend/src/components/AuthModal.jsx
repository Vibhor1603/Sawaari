/* eslint-disable react/prop-types */
import { useEffect } from "react";
import SigninForm from "../features/auth/SigninForm";
import SignUpForm from "../features/auth/SignUpForm";

export default function AuthModal({
  isOpen,
  onClose,
  mode, // 'signin' or 'signup'
  onSwitchMode,
  signinProps,
  signupProps,
}) {
  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-sawaari-yellow transition-colors duration-300 z-10"
          aria-label="Close modal"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Error Alert */}
        {(signinProps?.error || signupProps?.error) && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 flex items-center gap-2 text-sm">
            <span>⚠️</span>
            <span>{signinProps?.error || signupProps?.error}</span>
          </div>
        )}

        {/* Success Message for Signup */}
        {signupProps?.successMessage && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 flex items-center gap-2 text-sm">
            <span>✅</span>
            <span>{signupProps.successMessage}</span>
          </div>
        )}

        {/* Form Content */}
        {mode === "signin" ? (
          <div>
            <SigninForm {...signinProps} />
            <div className="mt-4 text-center">
              <span className="text-gray-200 text-sm">
                Don&apos;t have an account?{" "}
              </span>
              <button
                onClick={() => onSwitchMode("signup")}
                className="text-sawaari-yellow hover:text-white transition-colors duration-300 text-sm"
              >
                Sign Up
              </button>
            </div>
          </div>
        ) : (
          <div>
            <SignUpForm {...signupProps} />
            <div className="mt-4 text-center">
              <span className="text-gray-200 text-sm">
                Already have an account?{" "}
              </span>
              <button
                onClick={() => onSwitchMode("signin")}
                className="text-sawaari-yellow hover:text-white transition-colors duration-300 text-sm"
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
