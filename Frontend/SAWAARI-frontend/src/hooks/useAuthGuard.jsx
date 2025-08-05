import { useContext, useEffect } from "react";
import { AuthContext } from "../AuthContext";
import { useAuthModal } from "../contexts/AuthModalContext";
import toast from "react-hot-toast";

export const useAuthGuard = (
  redirectMessage = "Please sign in to continue"
) => {
  const { isAuthenticated, isLoading } = useContext(AuthContext);
  const { openSigninModal } = useAuthModal();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error(`🛺 ${redirectMessage}`);
      openSigninModal();
    }
  }, [isAuthenticated, isLoading, openSigninModal, redirectMessage]);

  return { isAuthenticated, isLoading };
};
