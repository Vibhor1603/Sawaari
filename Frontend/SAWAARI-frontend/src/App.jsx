/* eslint-disable no-unused-vars */
// App.jsx
import { useContext } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Navbar from "./navbar";
import Hotspots from "./hotspots";
import Footer from "./footer";
import Root from "./Root";
import Routeinfo from "./RouteInfo";
import RideBuddy from "./RideBuddy";
import { AuthContext } from "./AuthContext";
import { AuthModalProvider } from "./contexts/AuthModalContext";
import AuthModalContainer from "./components/AuthModalContainer";
import Logout from "./Logout";
import ForgotPassword from "./ForgotPassword";
import Contact from "./Contact";
import UserProfile from "./UserProfile";
import FloatingRickshaws from "./components/FloatingRickshaws";
import { Toaster } from "react-hot-toast";

export default function App() {
  const { hotspot } = useContext(AuthContext);

  return (
    <Router>
      <AuthModalProvider>
        <FloatingRickshaws />
        <Navbar />
        <Routes>
          <Route index element={<Root />} />
          <Route path="/home" element={<Root />} />
          <Route path="/hotspots" element={<Hotspots hotspot={hotspot} />} />
          <Route path="/routes" element={<Routeinfo hotspot={hotspot} />} />
          <Route path="/ridebuddy" element={<RideBuddy />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/feedbacks" element={<Contact />} />
        </Routes>
        <Footer />
        <AuthModalContainer />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#363636",
              color: "#fff",
              borderRadius: "8px",
              fontSize: "14px",
              maxWidth: "400px",
            },
            success: {
              style: {
                background: "#10B981",
              },
            },
            error: {
              style: {
                background: "#EF4444",
              },
            },
          }}
        />
      </AuthModalProvider>
    </Router>
  );
}
