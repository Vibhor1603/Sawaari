import { Navigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../AuthContext";

export default function Logout() {
  const { logout, isLoading } = useContext(AuthContext);
  const [isLoggingOut, setIsLoggingOut] = useState(true);

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout();
      } catch (error) {
        console.error("Logout error:", error);
      } finally {
        setIsLoggingOut(false);
      }
    };

    performLogout();
  }, [logout]);

  // Show loading state while logging out
  if (isLoggingOut || isLoading) {
    return (
      <div
        className="container d-flex justify-content-center align-items-center"
        style={{ minHeight: "50vh" }}
      >
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Logging out...</span>
          </div>
          <p className="mt-3" style={{ color: "var(--text-secondary)" }}>
            Logging you out securely...
          </p>
        </div>
      </div>
    );
  }

  return <Navigate to="/" replace />;
}
