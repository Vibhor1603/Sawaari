// Navbar.jsx
/* eslint-disable no-unused-vars */
import React from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
    return (
        <nav className="navbar fixed-top navbar-expand-lg">
            <div className="container-fluid">
                <Link to="/" className="navbar-brand">Sawaari</Link>
                <button className="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#navbarTogglerDemo01">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarTogglerDemo01">
                    <div className="navbar-nav">
                        <Link to="/hotspots" className="nav-link">Hotspots</Link>
                        <Link to="#" className="nav-link">Routes</Link>
                        <Link to="#" className="nav-link">Ride Buddy</Link>
                        <Link to="#" className="nav-link">Contact us</Link>
                    </div>
                    <div className="navbar-nav ms-auto">
                        <Link to="#" className="nav-link">Login</Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
