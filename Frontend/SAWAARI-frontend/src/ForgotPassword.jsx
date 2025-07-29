import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import authService from "./services/authService";
import toast from "./utils/toast";

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
  useState(() => {
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
      toast.error("Please enter your email address");
      return;
    }

    // Validate that it's an email address
    if (
      !formData.identifier.includes("@") ||
      !formData.identifier.includes(".")
    ) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
        }/forgot-password/send-otp`,
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
        toast.success(data.message);
      } else {
        toast.error(data.error || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!formData.otp.trim()) {
      toast.error("Please enter the OTP");
      return;
    }

    if (formData.otp.length !== 6) {
      toast.error("OTP must be 6 digits");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
        }/forgot-password/verify-otp`,
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
        toast.success(data.message);
      } else {
        toast.error(data.error || "Invalid OTP");
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      toast.error("Network error. Please try again.");
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
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
        }/forgot-password/reset`,
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
        navigate("/signin");
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

  const isEmail = formData.identifier.includes("@");

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Reset Password</h2>
          <p>
            {step === 1 && "Enter your email address to receive an OTP"}
            {step === 2 && "Enter the OTP sent to your email"}
            {step === 3 && "Create a new password for your account"}
          </p>
        </div>

        {/* Step 1: Enter identifier */}
        {step === 1 && (
          <form onSubmit={handleSendOTP} className="auth-form">
            <div className="form-group">
              <label htmlFor="identifier">Email Address</label>
              <input
                type="email"
                id="identifier"
                name="identifier"
                value={formData.identifier}
                onChange={handleInputChange}
                placeholder="Enter your email address"
                className="form-control"
                disabled={loading}
                required
              />
              <small className="form-text">
                We'll send you an OTP to reset your password
              </small>
            </div>

            <button
              type="submit"
              className="auth-btn primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Sending OTP...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Send OTP
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: Enter OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="auth-form">
            <div className="otp-info">
              <div className="otp-sent-to">
                <i className="fas fa-envelope"></i>
                <span>OTP sent to {formData.identifier}</span>
              </div>
              {otpData.timeRemaining > 0 && (
                <div className="otp-timer">
                  <i className="fas fa-clock"></i>
                  <span>Expires in {formatTime(otpData.timeRemaining)}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="otp">Enter OTP</label>
              <input
                type="text"
                id="otp"
                name="otp"
                value={formData.otp}
                onChange={handleInputChange}
                placeholder="Enter 6-digit OTP"
                className="form-control otp-input"
                maxLength="6"
                disabled={loading || otpData.timeRemaining === 0}
                required
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="auth-btn primary"
                disabled={loading || otpData.timeRemaining === 0}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Verifying...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i>
                    Verify OTP
                  </>
                )}
              </button>

              {otpData.timeRemaining === 0 && (
                <button
                  type="button"
                  className="auth-btn secondary"
                  onClick={() => setStep(1)}
                >
                  <i className="fas fa-redo"></i>
                  Send New OTP
                </button>
              )}
            </div>
          </form>
        )}

        {/* Step 3: Reset password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Enter new password (min 6 characters)"
                className="form-control"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your new password"
                className="form-control"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              className="auth-btn primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Resetting...
                </>
              ) : (
                <>
                  <i className="fas fa-key"></i>
                  Reset Password
                </>
              )}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <Link to="/signin" className="auth-link">
            <i className="fas fa-arrow-left"></i>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
