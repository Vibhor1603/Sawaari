/* eslint-disable no-unused-vars */
// Footer.jsx
import React from 'react';
// Assuming you have a separate CSS file for the footer

export default function Footer() {
    return (
        <footer className="footer  py-3 bg-dark text-white fixed-bottom">
            <div className="container text-center">
                <p className="mb-2">&copy; 2024 Sawaari. All rights reserved.</p>
                <nav className="mb-3">
                    <ul className="list-inline">
                        <li className="list-inline-item">
                            <a href="#" className="btn btn-light text-dark">
                                <i className="fab fa-facebook-f"></i> Facebook
                            </a>
                        </li>
                        <li className="list-inline-item">
                            <a href="#" className="btn btn-light text-dark">
                                <i className="fab fa-instagram"></i> Instagram
                            </a>
                        </li>
                        <li className="list-inline-item">
                            <a href="#" className="btn btn-light text-dark">
                                <i className="fab fa-twitter"></i> Twitter
                            </a>
                        </li>
                        <li className="list-inline-item">
                            <a href="#" className="btn btn-light text-dark">
                                <i className="fas fa-envelope"></i> Contact Us
                            </a>
                        </li>
                    </ul>
                </nav>
                <div className="footer-bottom">
                    <a href="#" className="text-light">Privacy Policy</a> | 
                    <a href="#" className="text-light"> Terms of Service</a>
                </div>
            </div>
        </footer>
    );
}
