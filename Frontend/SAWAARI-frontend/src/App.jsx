/* eslint-disable no-unused-vars */
import React from "react";
import Navbar from "./navbar";
import About from "./about";
import Testimonials from "./testimonials";
import { testimonials } from "./userTestimonials";
import Footer from "./footer";

function App() {
       
  return(
    <>
    
    <Navbar/>
    <img src="../src/assets/banner2.jpg" className="banner-img" alt="banner" />
    <About/>
    <Testimonials testimonials={testimonials} />
    <Footer />
    
    
    </>
    
  )
  
}

export default App;
