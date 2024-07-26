/* eslint-disable no-unused-vars */
import React from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
    return (
        <nav className="navbar fixed-top navbar-expand-lg">
            <div className="container-fluid">
               <a href="#"className="navbar-brand">Sawaari</a>
                <button className="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#navbarTogglerDemo01">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarTogglerDemo01">
                    <div className="navbar-nav">
                    <a href="#" className="nav-link">Hotspots</a>
                        <a href="#" className="nav-link">Routes</a>
                        <a href="#" className="nav-link">Ride Buddy</a>
                        <a href="#" className="nav-link">Contact us</a>
                    </div>
                    <div className="navbar-nav ms-auto">
                        <a href="#" className="nav-link">Login</a>
                    </div>
                </div>
            </div>
        </nav>
    );
}
