/* eslint-disable no-unused-vars */
import React from 'react';


export default function About() {
    return (
        <>
            <div className="container text-left about">
                <div className="row align-items-center">
                    <div className="col-md-6">
                        <img src="/download.jpeg" className="img-fluid auto-image" alt="auto-rickshaw" />
                    </div>
                    <div className="col-md-6 text-white">
                        <h1 className='headings'>About Us</h1>
                        <p>
                            Welcome to our Auto Rickshaw Service! Our mission is to make urban commuting easier and more efficient by providing real-time information on auto rickshaw availability and routes. We understand the challenges of finding reliable transportation in busy cities like Delhi NCR and Mumbai, and our platform aims to address these issues with innovative solutions.
                        </p>
                       
                    </div>
                </div>
                
            </div>
            <div className="container text-left about">
            <div className='row align-items-center'>
                <div className='col-md-6'>
                <img src="/auto-rik.jpeg" className="img-fluid auto-image" alt="auto-rickshaw" />
                </div>
                <div className='col-md-6 text-white'>
                <h1 className="headings">What we offer</h1>
                <ul className="list">
                            <li>Check for auto rickshaw hotspots in real-time, highlighted with colors based on the number of available auto rickshaws.</li>
                            <li>View destinations accessible from specific hotspots, helping you plan your journey more effectively.</li>
                            <li>Get detailed route and fare information for your desired trips, ensuring transparency and convenience.</li>
                            <li>Find share buddies for rides, promoting cost-effective and eco-friendly travel options.</li>
                        </ul>
                        <p>
                            Our goal is to provide a seamless and user-friendly experience for commuters, making daily travel hassle-free and efficient. We are committed to continuously improving our services and expanding our reach to better serve our users.
                        </p>
                     
                
                </div>
            </div>
            </div>
        </>
    );
}
