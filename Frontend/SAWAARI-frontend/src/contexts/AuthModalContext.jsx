import { createContext, useContext, useState } from "react";

const AuthModalContext = createContext();

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
};

export const AuthModalProvider = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("signin"); // 'signin' or 'signup'

  const openSigninModal = () => {
    setModalMode("signin");
    setIsModalOpen(true);
  };

  const openSignupModal = () => {
    setModalMode("signup");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const switchMode = (mode) => {
    setModalMode(mode);
  };

  const value = {
    isModalOpen,
    modalMode,
    openSigninModal,
    openSignupModal,
    closeModal,
    switchMode,
  };

  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  );
};
