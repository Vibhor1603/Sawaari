import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { useAuthModal } from "../contexts/AuthModalContext";
import toast from "react-hot-toast";

export const useAuthGuard = (
  redirectMessage = "Please sign in to continue"
) => {
  const { isAuthenticated, isLoading } = useContext(AuthContext);
  const { openSigninModal } = useAuthModal();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error(`🛺 ${redirectMessage}`);
      navigate("/");
      // Open signin modal after a short delay to ensure we're on homepage
      setTimeout(() => {
        openSigninModal();
      }, 100);
    }
  }, [isAuthenticated, isLoading, openSigninModal, redirectMessage, navigate]);

  return { isAuthenticated, isLoading };
};
