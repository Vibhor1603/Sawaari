// Navbar.jsx
/* eslint-disable no-unused-vars */
import React from "react";
//import { Link } from "react-router-dom";
import { NavLink} from "react-router-dom";

export default function Navbar() {
    return (
        <nav className="navbar fixed-top navbar-expand-lg ">
            <div className="container-fluid">
                <NavLink to="/" className="navbar-brand "><img src="../src/assets/logo.jpg" alt="logo-img" className="logo-img"/></NavLink>
                <button className="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#navbarTogglerDemo01">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarTogglerDemo01">
                    <div className="navbar-nav nav-bar ">
                    <NavLink to="/home" className="nav-link nav-items">Home</NavLink>
                        <NavLink to="/hotspots" className="nav-link nav-items">Hotspots</NavLink>
                        <NavLink to="/routes" className="nav-link nav-items">Routes</NavLink>
                        <NavLink to="#" className="nav-link nav-items">Ride Buddy</NavLink>
                        <NavLink to="#" className="nav-link nav-items" >Contact us</NavLink>
                    </div>
                    <div className="navbar-nav ">
                        <NavLink to="#" className="nav-link "><button className=" btn login-btn">Login</button></NavLink>
                    </div>
                </div>
            </div>
        </nav>
    );
}
