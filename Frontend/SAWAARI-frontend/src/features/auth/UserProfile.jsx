import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../AuthContext";
import { useAuthGuard } from "../../hooks/useAuthGuard";
import authService from "../../services/authService";
import toast from "react-hot-toast";
import FloatingRickshaws from "../../components/common/FloatingRickshaws";

const UserProfile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const { isAuthenticated, isLoading } = useAuthGuard(
    "Please sign in to access your profile"
  );

  // Profile states
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password reset states (using forgot password flow)
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordResetStep, setPasswordResetStep] = useState(1); // 1: send OTP, 2: verify OTP, 3: new password
  const [passwordResetData, setPasswordResetData] = useState({
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [otpData, setOtpData] = useState({
    token: "",
    resetToken: "",
    expiresIn: 0,
    timeRemaining: 0,
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [isAuthenticated, user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!profileData.name.trim()) {
      toast.error("🛺 Name cannot be empty");
      return;
    }

    // Validate phone number if provided
    if (profileData.phone && profileData.phone.trim()) {
      const phoneRegex = /^[+]?[\d\s\-()]{10,15}$/;
      if (!phoneRegex.test(profileData.phone.trim())) {
        toast.error("🛺 Please enter a valid phone number");
        return;
      }
    }

    setLoading(true);
    try {
      const response = await authService.apiRequest("/api/user/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: profileData.name.trim(),
          phone: profileData.phone.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update user context
        updateUser({
          ...user,
          name: profileData.name.trim(),
          phone: profileData.phone.trim(),
        });
        setIsEditing(false);
        toast.success("🛺 Profile updated successfully!");
      } else {
        throw new Error(data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(`🛺 ${error.message || "Failed to update profile"}`);
    } finally {
      setLoading(false);
    }
  };

  // Timer for OTP expiry
  useEffect(() => {
    let interval;
    if (passwordResetStep === 2 && otpData.timeRemaining > 0) {
      interval = setInterval(() => {
        setOtpData((prev) => ({
          ...prev,
          timeRemaining: Math.max(0, prev.timeRemaining - 1),
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [passwordResetStep, otpData.timeRemaining]);

  const handlePasswordResetRequest = async () => {
    setPasswordResetLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/forgot-password/send-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ identifier: user.email }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setOtpData({
          token: data.token,
          resetToken: "",
          expiresIn: data.expiresIn,
          timeRemaining: data.expiresIn,
        });
        setPasswordResetStep(2);
        toast.success("🛺 OTP sent to your email!");
      } else {
        throw new Error(data.error || data.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Password reset request error:", error);
      toast.error(`🛺 ${error.message || "Failed to send OTP"}`);
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const handleOtpVerification = async (e) => {
    e.preventDefault();

    if (!passwordResetData.otp.trim() || passwordResetData.otp.length !== 6) {
      toast.error("🛺 Please enter a valid 6-digit OTP");
      return;
    }

    setPasswordResetLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/forgot-password/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identifier: user.email,
            otp: passwordResetData.otp.trim(),
            token: otpData.token,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setOtpData((prev) => ({ ...prev, resetToken: data.resetToken }));
        setPasswordResetStep(3);
        toast.success("🛺 OTP verified! Set your new password");
      } else {
        throw new Error(data.error || data.message || "Invalid OTP");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error(`🛺 ${error.message || "Invalid OTP"}`);
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    if (
      !passwordResetData.newPassword ||
      passwordResetData.newPassword.length < 6
    ) {
      toast.error("🛺 Password must be at least 6 characters long");
      return;
    }

    if (passwordResetData.newPassword !== passwordResetData.confirmPassword) {
      toast.error("🛺 Passwords do not match");
      return;
    }

    setPasswordResetLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/forgot-password/reset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resetToken: otpData.resetToken,
            newPassword: passwordResetData.newPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        resetPasswordResetFlow();
        toast.success("🛺 Password reset successfully!");
      } else {
        throw new Error(
          data.error || data.message || "Failed to reset password"
        );
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error(`🛺 ${error.message || "Failed to reset password"}`);
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const resetPasswordResetFlow = () => {
    setShowPasswordReset(false);
    setPasswordResetStep(1);
    setPasswordResetData({
      otp: "",
      newPassword: "",
      confirmPassword: "",
    });
    setOtpData({
      token: "",
      resetToken: "",
      expiresIn: 0,
      timeRemaining: 0,
    });
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Password strength checker
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, text: "", color: "" };

    let strength = 0;
    const checks = {
      length: password.length >= 6,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    strength = Object.values(checks).filter(Boolean).length;

    if (strength <= 2) return { strength, text: "Weak", color: "text-red-400" };
    if (strength <= 3)
      return { strength, text: "Fair", color: "text-yellow-400" };
    if (strength <= 4)
      return { strength, text: "Good", color: "text-blue-400" };
    return { strength, text: "Strong", color: "text-green-400" };
  };

  const passwordStrength = getPasswordStrength(passwordResetData.newPassword);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sawaari-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-200">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (auth guard will handle modal)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black pt-20 relative">
      <FloatingRickshaws />

      <div className="container-sawaari relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-sawaari-yellow/20 to-sawaari-green/20 border border-sawaari-yellow/30 rounded-lg px-4 py-2 mb-6">
            <span className="text-xl">👤</span>
            <span className="text-sm font-semibold text-sawaari-yellow">
              User Profile
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Manage Your Account
          </h1>
          <p className="text-xl text-gray-200 max-w-2xl mx-auto">
            Update your profile information and manage your account settings
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Profile Information Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Profile Information
              </h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 bg-sawaari-yellow text-black rounded-lg hover:bg-sawaari-yellow/80 transition-colors"
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-sawaari-yellow mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  disabled={!isEditing}
                  className={`w-full p-3 rounded-lg text-white transition-all duration-300 ${
                    isEditing
                      ? "bg-black/30 border border-white/20 focus:border-sawaari-yellow focus:ring-2 focus:ring-sawaari-yellow/20"
                      : "bg-black/20 border border-white/10 cursor-not-allowed"
                  }`}
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-sawaari-yellow mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="w-full p-3 bg-black/20 border border-white/10 rounded-lg text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-sawaari-yellow mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  disabled={!isEditing}
                  className={`w-full p-3 rounded-lg text-white transition-all duration-300 ${
                    isEditing
                      ? "bg-black/30 border border-white/20 focus:border-sawaari-yellow focus:ring-2 focus:ring-sawaari-yellow/20"
                      : "bg-black/20 border border-white/10 cursor-not-allowed"
                  }`}
                  placeholder="Enter your phone number"
                />
              </div>

              {isEditing && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary"
                >
                  {loading ? "Updating..." : "Update Profile"}
                </button>
              )}
            </form>
          </div>

          {/* Security Settings Card */}
          <div className="card">
            <h2 className="text-2xl font-bold text-white mb-6">
              Security Settings
            </h2>

            <div className="space-y-6">
              <div className="p-4 bg-black/30 border border-white/10 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Password
                </h3>
                <p className="text-gray-300 text-sm mb-4">
                  Keep your account secure by using a strong password
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowPasswordReset(true)}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reset Password
                  </button>
                  o
                </div>
              </div>

              <div className="p-4 bg-black/30 border border-white/10 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Account Status
                </h3>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <span className="text-green-400 text-sm">Active Account</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password Reset Modal */}
        {showPasswordReset && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 rounded-xl w-full max-w-md border border-neutral-700 relative">
              <button
                onClick={resetPasswordResetFlow}
                className="absolute top-4 right-4 w-8 h-8 bg-neutral-800 hover:bg-neutral-700 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <svg
                  className="w-4 h-4"
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

              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  Reset Password
                </h3>

                {/* Step Indicator */}
                <div className="flex items-center justify-center mb-6">
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3].map((stepNumber) => (
                      <div key={stepNumber} className="flex items-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                            passwordResetStep >= stepNumber
                              ? "bg-sawaari-yellow text-black"
                              : "bg-white/20 text-gray-400"
                          }`}
                        >
                          {stepNumber}
                        </div>
                        {stepNumber < 3 && (
                          <div
                            className={`w-6 h-0.5 mx-1 transition-all duration-300 ${
                              passwordResetStep > stepNumber
                                ? "bg-sawaari-yellow"
                                : "bg-white/20"
                            }`}
                          ></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step 1: Send OTP */}
                {passwordResetStep === 1 && (
                  <div className="space-y-4">
                    <p className="text-gray-300 text-sm">
                      We&apos;ll send an OTP to your email address:{" "}
                      <strong>{user?.email}</strong>
                    </p>
                    <button
                      onClick={handlePasswordResetRequest}
                      disabled={passwordResetLoading}
                      className="w-full btn-primary"
                    >
                      {passwordResetLoading ? "Sending OTP..." : "Send OTP"}
                    </button>
                  </div>
                )}

                {/* Step 2: Verify OTP */}
                {passwordResetStep === 2 && (
                  <form onSubmit={handleOtpVerification} className="space-y-4">
                    {/* OTP Info */}
                    <div className="bg-black/40 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-2 text-sawaari-yellow text-sm">
                        <span>📧</span>
                        <span>OTP sent to {user?.email}</span>
                      </div>
                      {otpData.timeRemaining > 0 && (
                        <div className="flex items-center gap-2 text-gray-200 text-sm">
                          <span>⏰</span>
                          <span>
                            Expires in {formatTime(otpData.timeRemaining)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-sawaari-yellow mb-2">
                        Enter OTP
                      </label>
                      <input
                        type="text"
                        value={passwordResetData.otp}
                        onChange={(e) =>
                          setPasswordResetData((prev) => ({
                            ...prev,
                            otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                          }))
                        }
                        placeholder="Enter 6-digit OTP"
                        className="w-full p-3 bg-black/30 border border-white/20 rounded-lg text-white focus:border-sawaari-yellow focus:ring-2 focus:ring-sawaari-yellow/20 text-center text-lg tracking-widest"
                        maxLength={6}
                        disabled={
                          passwordResetLoading || otpData.timeRemaining === 0
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <button
                        type="submit"
                        disabled={
                          passwordResetLoading || otpData.timeRemaining === 0
                        }
                        className={`w-full btn-primary ${
                          passwordResetLoading || otpData.timeRemaining === 0
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {passwordResetLoading ? "Verifying..." : "Verify OTP"}
                      </button>

                      {otpData.timeRemaining === 0 && (
                        <button
                          type="button"
                          onClick={() => setPasswordResetStep(1)}
                          className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          Send New OTP
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {/* Step 3: Set New Password */}
                {passwordResetStep === 3 && (
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-sawaari-yellow mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordResetData.newPassword}
                        onChange={(e) =>
                          setPasswordResetData((prev) => ({
                            ...prev,
                            newPassword: e.target.value,
                          }))
                        }
                        placeholder="Enter new password (min 6 characters)"
                        className="w-full p-3 bg-black/30 border border-white/20 rounded-lg text-white focus:border-sawaari-yellow focus:ring-2 focus:ring-sawaari-yellow/20"
                        minLength={6}
                        required
                      />
                      {passwordResetData.newPassword && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-400">
                              Password Strength:
                            </span>
                            <span className={passwordStrength.color}>
                              {passwordStrength.text}
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                passwordStrength.strength <= 2
                                  ? "bg-red-500"
                                  : passwordStrength.strength <= 3
                                  ? "bg-yellow-500"
                                  : passwordStrength.strength <= 4
                                  ? "bg-blue-500"
                                  : "bg-green-500"
                              }`}
                              style={{
                                width: `${
                                  (passwordStrength.strength / 5) * 100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-sawaari-yellow mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordResetData.confirmPassword}
                        onChange={(e) =>
                          setPasswordResetData((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                        placeholder="Confirm new password"
                        className={`w-full p-3 bg-black/30 border rounded-lg text-white focus:ring-2 transition-all duration-300 ${
                          passwordResetData.confirmPassword &&
                          passwordResetData.newPassword !==
                            passwordResetData.confirmPassword
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                            : passwordResetData.confirmPassword &&
                              passwordResetData.newPassword ===
                                passwordResetData.confirmPassword
                            ? "border-green-500 focus:border-green-500 focus:ring-green-500/20"
                            : "border-white/20 focus:border-sawaari-yellow focus:ring-sawaari-yellow/20"
                        }`}
                        required
                      />
                      {passwordResetData.confirmPassword && (
                        <div className="mt-1 text-xs">
                          {passwordResetData.newPassword ===
                          passwordResetData.confirmPassword ? (
                            <span className="text-green-400">
                              ✓ Passwords match
                            </span>
                          ) : (
                            <span className="text-red-400">
                              ✗ Passwords don&apos;t match
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={resetPasswordResetFlow}
                        className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={passwordResetLoading}
                        className="flex-1 btn-primary"
                      >
                        {passwordResetLoading
                          ? "Resetting..."
                          : "Reset Password"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-400">
                    💡 <strong>Security Tips:</strong>
                  </p>
                  <ul className="text-xs text-gray-300 mt-1 space-y-1">
                    <li>• Use at least 6 characters</li>
                    <li>• Include numbers and special characters</li>
                    <li>• Don&apos;t reuse old passwords</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
