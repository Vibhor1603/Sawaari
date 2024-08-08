/* eslint-disable no-unused-vars */
import React, { useState,useContext } from "react";
import { NavLink } from "react-router-dom";

import { AuthContext } from "./AuthContext";


export default function Navbar() {
    const [showLogin, setShowLogin] = useState(false);
    const { token } = useContext(AuthContext);

    const handleLoginClick = (e) => {
        e.preventDefault();
        setShowLogin(true);
    };

    const handleCloseLogin = () => {
        setShowLogin(false);
    };

    return (
        <>
            <nav className="navbar fixed-top navbar-expand-lg">
                <div className="container-fluid">
                    <NavLink to="/" className="navbar-brand">
                        <img src="/logo.jpg" alt="logo-img" className="logo-img"/>
                    </NavLink>
                    <button className="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#navbarTogglerDemo01">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarTogglerDemo01">
                        <div className="navbar-nav nav-bar">
                            <NavLink to="/home" className="nav-link nav-items">Home</NavLink>
                            <NavLink to="/hotspots" className="nav-link nav-items">Hotspots</NavLink>
                            <NavLink to="/routes" className="nav-link nav-items">Routes</NavLink>
                            <NavLink to="/ridebuddy" className="nav-link nav-items">Ride Buddy</NavLink>
                            <NavLink to="/feedbacks" className="nav-link nav-items ">Contact us</NavLink>
                        </div>
                        <div className="navbar-nav">
                        {token == null ? (
                <>
                  <li className="nav-item">
                    <NavLink className="nav-link signin-btn" to="/signin">
                      SignIn
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink className="nav-link login-btn" to="/signup">
                      SignUp
                    </NavLink>
                  </li>
                </>
              ) : (
                <>
                  
                  <li className="nav-item">
                    <NavLink className="nav-link login-btn " to="logout">
                      Logout
                    </NavLink>
                  </li>
                </>
              )}
                        </div>
                    </div>
                </div>
            </nav>

           
        </>
    );
}