import { useState, useEffect, useContext } from "react";
import { AuthContext } from "./AuthContext";
import { useAuthGuard } from "./hooks/useAuthGuard";
import authService from "./services/authService";
import toast from "./utils/toast";
import FloatingRickshaws from "./components/FloatingRickshaws";

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

  // Password reset states
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordResetStep, setPasswordResetStep] = useState(1); // 1: request, 2: verify OTP, 3: new password
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpData, setOtpData] = useState({ token: "", resetToken: "" });

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

  const handlePasswordResetRequest = async () => {
    setOtpLoading(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "https://sawaari.onrender.com"
        }/forgot-password/send-otp`,
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
        setOtpData({ token: data.token, resetToken: "" });
        setPasswordResetStep(2);
        toast.success("🛺 OTP sent to your email!");
      } else {
        throw new Error(data.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Password reset request error:", error);
      toast.error(`🛺 ${error.message || "Failed to send OTP"}`);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpVerification = async (e) => {
    e.preventDefault();

    if (!otp.trim() || otp.length !== 6) {
      toast.error("🛺 Please enter a valid 6-digit OTP");
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "https://sawaari.onrender.com"
        }/forgot-password/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identifier: user.email,
            otp: otp.trim(),
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
        throw new Error(data.message || "Invalid OTP");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error(`🛺 ${error.message || "Invalid OTP"}`);
    } finally {
      setOtpLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 6) {
      toast.error("🛺 Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("🛺 Passwords do not match");
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "https://sawaari.onrender.com"
        }/forgot-password/reset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resetToken: otpData.resetToken,
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setShowPasswordReset(false);
        setPasswordResetStep(1);
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setOtpData({ token: "", resetToken: "" });
        toast.success("🛺 Password reset successfully!");
      } else {
        throw new Error(data.message || "Failed to reset password");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error(`🛺 ${error.message || "Failed to reset password"}`);
    } finally {
      setOtpLoading(false);
    }
  };

  const resetPasswordFlow = () => {
    setShowPasswordReset(false);
    setPasswordResetStep(1);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setOtpData({ token: "", resetToken: "" });
  };

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
                <button
                  onClick={() => setShowPasswordReset(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reset Password
                </button>
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
                onClick={resetPasswordFlow}
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

                {passwordResetStep === 1 && (
                  <div className="space-y-4">
                    <p className="text-gray-300 text-sm">
                      We&apos;ll send an OTP to your email address:{" "}
                      <strong>{user?.email}</strong>
                    </p>
                    <button
                      onClick={handlePasswordResetRequest}
                      disabled={otpLoading}
                      className="w-full btn-primary"
                    >
                      {otpLoading ? "Sending OTP..." : "Send OTP"}
                    </button>
                  </div>
                )}

                {passwordResetStep === 2 && (
                  <form onSubmit={handleOtpVerification} className="space-y-4">
                    <p className="text-gray-300 text-sm">
                      Enter the 6-digit OTP sent to your email
                    </p>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="Enter OTP"
                      className="w-full p-3 bg-black/30 border border-white/20 rounded-lg text-white focus:border-sawaari-yellow focus:ring-2 focus:ring-sawaari-yellow/20"
                      maxLength={6}
                    />
                    <button
                      type="submit"
                      disabled={otpLoading}
                      className="w-full btn-primary"
                    >
                      {otpLoading ? "Verifying..." : "Verify OTP"}
                    </button>
                  </form>
                )}

                {passwordResetStep === 3 && (
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <p className="text-gray-300 text-sm">
                      Enter your new password
                    </p>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New Password"
                      className="w-full p-3 bg-black/30 border border-white/20 rounded-lg text-white focus:border-sawaari-yellow focus:ring-2 focus:ring-sawaari-yellow/20"
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm New Password"
                      className="w-full p-3 bg-black/30 border border-white/20 rounded-lg text-white focus:border-sawaari-yellow focus:ring-2 focus:ring-sawaari-yellow/20"
                    />
                    <button
                      type="submit"
                      disabled={otpLoading}
                      className="w-full btn-primary"
                    >
                      {otpLoading ? "Resetting..." : "Reset Password"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
