// Navbar.jsx
/* eslint-disable no-unused-vars */
import React from "react";
//import { Link } from "react-router-dom";
import { NavLink} from "react-router-dom";

export default function Navbar() {
    return (
        <nav className="navbar fixed-top navbar-expand-lg">
            <div className="container-fluid">
                <NavLink to="/" className="navbar-brand">Sawaari</NavLink>
                <button className="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#navbarTogglerDemo01">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarTogglerDemo01">
                    <div className="navbar-nav">
                        <NavLink to="/hotspots" className="nav-link">Hotspots</NavLink>
                        <NavLink to="#" className="nav-link">Routes</NavLink>
                        <NavLink to="#" className="nav-link">Ride Buddy</NavLink>
                        <NavLink to="#" className="nav-link">Contact us</NavLink>
                    </div>
                    <div className="navbar-nav ms-auto">
                        <NavLink to="#" className="nav-link">Login</NavLink>
                    </div>
                </div>
            </div>
        </nav>
    );
}
