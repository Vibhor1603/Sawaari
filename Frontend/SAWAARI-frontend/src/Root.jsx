/* eslint-disable no-unused-vars */
import React from "react";
import About from "./about";
import Testimonials from "./testimonials";
import Footer from "./footer";
import { testimonials } from './userTestimonials';


export default function Root(){
    return(
<>
<img src="../src/assets/banner2.jpg" className="banner-img" alt="banner" />
<About />
<Testimonials testimonials={testimonials}/>
<Footer />
</>
    )
}