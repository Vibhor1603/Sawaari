/* eslint-disable no-unused-vars */
// App.jsx
import { React, useContext } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Navbar from "./navbar";
import Hotspots from "./hotspots";
import Footer from "./footer";
import Root from "./Root";
import Routeinfo from "./RouteInfo";
import RideBuddy from "./RideBuddy";
import SignUp from "./Signup";
import SignIn from "./SignIn";
import { AuthContext } from "./AuthContext";
import Logout from "./Logout";
import ForgotPassword from "./ForgotPassword";
import Contact from "./Contact";

export default function App() {
  const { hotspot } = useContext(AuthContext);
  const { token } = useContext(AuthContext);

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route index element={<Root />} />
        <Route path="/home" element={<Root />} />
        <Route path="/hotspots" element={<Hotspots hotspot={hotspot} />} />
        <Route path="/routes" element={<Routeinfo hotspot={hotspot} />} />
        <Route path="/ridebuddy" element={token ? <RideBuddy /> : <SignIn />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/feedbacks" element={<Contact />} />
      </Routes>
      <Footer />
    </Router>
  );
}
