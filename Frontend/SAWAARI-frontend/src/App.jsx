/* eslint-disable no-unused-vars */
// App.jsx
import { useContext } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Navbar, Footer } from "./components/layout";
import Hotspots from "./features/hotspots/hotspots";
import Root from "./Root";
import Routeinfo from "./features/routes/RouteInfo";
import RideBuddy from "./features/ridebuddy/RideBuddy";
import { AuthContext } from "./AuthContext";
import { AuthModalProvider } from "./contexts/AuthModalContext";
import { AuthModalContainer } from "./components/auth";
import Logout from "./features/auth/Logout";
import ForgotPassword from "./features/auth/ForgotPassword";
import Contact from "./features/contact/Contact";
import UserProfile from "./features/auth/UserProfile";
import { FloatingRickshaws, NotFound } from "./components/common";
import { Toaster } from "react-hot-toast";

export default function App() {
  // Hotspot data is now handled by individual components using database-driven lazy loading

  return (
    <Router>
      <AuthModalProvider>
        <FloatingRickshaws />
        <Navbar />
        <Routes>
          <Route index element={<Root />} />
          <Route path="/home" element={<Root />} />
          <Route path="/hotspots" element={<Hotspots />} />
          <Route path="/routes" element={<Routeinfo />} />
          <Route path="/ridebuddy" element={<RideBuddy />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/feedbacks" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
        <AuthModalContainer />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 2000, // Fixed: Reduced to 2 seconds as requested
            style: {
              background: "#363636",
              color: "#fff",
              borderRadius: "8px",
              fontSize: "14px",
              maxWidth: "400px",
            },
            success: {
              duration: 2000, // Ensure success toasts also auto-dismiss in 2 seconds
              style: {
                background: "#10B981",
              },
            },
            error: {
              duration: 2000, // Ensure error toasts also auto-dismiss in 2 seconds
              style: {
                background: "#EF4444",
              },
            },
            loading: {
              duration: Infinity, // Loading toasts should not auto-dismiss
            },
          }}
        />
      </AuthModalProvider>
    </Router>
  );
}
