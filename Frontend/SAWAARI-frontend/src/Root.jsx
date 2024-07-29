/* eslint-disable no-unused-vars */
import React from "react";
import About from "./about";
import Testimonials from "./testimonials";
import Footer from "./footer";
import { testimonials } from './userTestimonials';
import Carousel from "./Carousel";

export default function Root(){
    return(
<>
<Carousel />
<About />
<Testimonials testimonials={testimonials}/>

</>
    )
}