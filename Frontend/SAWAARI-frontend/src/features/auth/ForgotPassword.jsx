import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Enter identifier, 2: Enter OTP, 3: Reset password
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    identifier: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [otpData, setOtpData] = useState({
    token: "",
    expiresIn: 0,
    timeRemaining: 0,
  });

  // Timer for OTP expiry
  useEffect(() => {
    let interval;
    if (step === 2 && otpData.timeRemaining > 0) {
      interval = setInterval(() => {
        setOtpData((prev) => ({
          ...prev,
          timeRemaining: Math.max(0, prev.timeRemaining - 1),
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, otpData.timeRemaining]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();

    if (!formData.identifier.trim()) {
      toast.error("🛺 Please enter your email address");
      return;
    }

    if (
      !formData.identifier.includes("@") ||
      !formData.identifier.includes(".")
    ) {
      toast.error("🛺 Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/api/auth/forgot-password/send-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identifier: formData.identifier.trim(),
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setOtpData({
          token: data.token,
          expiresIn: data.expiresIn,
          timeRemaining: data.expiresIn,
        });
        setStep(2);
        toast.success(`🛺 ${data.message}`);
      } else {
        toast.error(`🛺 ${data.error || "Failed to send OTP"}`);
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      toast.error("🛺 Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!formData.otp.trim()) {
      toast.error("🛺 Please enter the OTP");
      return;
    }

    if (formData.otp.length !== 6) {
      toast.error("🛺 OTP must be 6 digits");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/api/auth/forgot-password/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identifier: formData.identifier,
            otp: formData.otp,
            token: otpData.token,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setOtpData((prev) => ({
          ...prev,
          resetToken: data.resetToken,
        }));
        setStep(3);
        toast.success(`🛺 ${data.message}`);
      } else {
        toast.error(`🛺 ${data.error || "Invalid OTP"}`);
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      toast.error("🛺 Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!formData.newPassword) {
      toast.error("Please enter a new password");
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/auth/forgot-password/reset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resetToken: otpData.resetToken,
            newPassword: formData.newPassword,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        navigate("/");
      } else {
        toast.error(data.error || "Failed to reset password");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-black pt-16 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[10%] text-2xl opacity-10 animate-float">
          🔑
        </div>
        <div
          className="absolute top-[30%] right-[15%] text-2xl opacity-10 animate-float"
          style={{ animationDelay: "1s" }}
        >
          📧
        </div>
        <div
          className="absolute bottom-[25%] left-[20%] text-2xl opacity-10 animate-float"
          style={{ animationDelay: "2s" }}
        >
          🔒
        </div>
        <div
          className="absolute bottom-[35%] right-[25%] text-2xl opacity-10 animate-float"
          style={{ animationDelay: "3s" }}
        >
          🛺
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-strong rounded-2xl p-6 border border-white/20 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-2xl">🔑</span>
              <h2 className="text-2xl font-bold text-white">Reset Password</h2>
            </div>
            <p className="text-gray-200 text-sm">
              {step === 1 && "Enter your email to receive an OTP"}
              {step === 2 && "Enter the OTP sent to your email"}
              {step === 3 && "Create a new password"}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-2">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      step >= stepNumber
                        ? "bg-sawaari-yellow text-black"
                        : "bg-white/20 text-gray-400"
                    }`}
                  >
                    {stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div
                      className={`w-6 h-0.5 mx-1 transition-all duration-300 ${
                        step > stepNumber ? "bg-sawaari-yellow" : "bg-white/20"
                      }`}
                    ></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Enter identifier */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-sm font-medium text-sawaari-yellow mb-1"
                >
                  📧 Email Address
                </label>
                <input
                  type="email"
                  id="identifier"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleInputChange}
                  placeholder="Enter your email address"
                  disabled={loading}
                  required
                  className="form-input h-11"
                />
                <p className="text-xs text-gray-200 mt-1">
                  We&apos;ll send you an OTP to reset your password
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`btn-primary w-full h-11 ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending OTP...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>📧</span>
                    <span>Send OTP</span>
                  </div>
                )}
              </button>
            </form>
          )}

          {/* Step 2: Enter OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              {/* OTP Info */}
              <div className="bg-black/40 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-sawaari-yellow text-sm">
                  <span>📧</span>
                  <span>OTP sent to {formData.identifier}</span>
                </div>
                {otpData.timeRemaining > 0 && (
                  <div className="flex items-center gap-2 text-gray-200 text-sm">
                    <span>⏰</span>
                    <span>Expires in {formatTime(otpData.timeRemaining)}</span>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="otp"
                  className="block text-sm font-medium text-sawaari-yellow mb-1"
                >
                  🔢 Enter OTP
                </label>
                <input
                  type="text"
                  id="otp"
                  name="otp"
                  value={formData.otp}
                  onChange={handleInputChange}
                  placeholder="Enter 6-digit OTP"
                  maxLength="6"
                  disabled={loading || otpData.timeRemaining === 0}
                  required
                  className="form-input h-11 text-center text-lg tracking-widest"
                />
              </div>

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={loading || otpData.timeRemaining === 0}
                  className={`btn-primary w-full h-11 ${
                    loading || otpData.timeRemaining === 0
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>✅</span>
                      <span>Verify OTP</span>
                    </div>
                  )}
                </button>

                {otpData.timeRemaining === 0 && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-secondary w-full h-10"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>🔄</span>
                      <span>Send New OTP</span>
                    </div>
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Step 3: Reset password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-sawaari-yellow mb-1"
                >
                  🔒 New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  placeholder="Enter new password (min 6 characters)"
                  disabled={loading}
                  required
                  className="form-input h-11"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-sawaari-yellow mb-1"
                >
                  🔒 Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your new password"
                  disabled={loading}
                  required
                  className="form-input h-11"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`btn-primary w-full h-11 ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Resetting...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>🔑</span>
                    <span>Reset Password</span>
                  </div>
                )}
              </button>
            </form>
          )}

          {/* Back to Sign In */}
          <div className="text-center mt-6 pt-4 border-t border-white/20">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sawaari-yellow hover:text-white font-medium transition-colors duration-300 text-sm"
            >
              <span>←</span>
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
