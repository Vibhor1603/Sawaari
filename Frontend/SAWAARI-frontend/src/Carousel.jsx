/* eslint-disable no-unused-vars */
import React from 'react'
import banner1 from '/banner-3.jpg';
import banner2 from '/banner2.jpg';
import logo from '/third-banner.jpg';

export default function Carousel() {
  return (
    <div id="carouselExampleInterval" className="carousel slide" data-bs-ride="carousel">
      <div className="carousel-inner">
        <div className="carousel-item active" data-bs-interval="2000">
          <img src={banner1} className="d-block w-100" alt="..." /> 
        </div>
        <div className="carousel-item" data-bs-interval="3000">
          <img src={banner2} className="d-block w-100" alt="..." />
        </div>
        <div className="carousel-item" data-bs-interval="4000">
          <img src={logo} className="d-block third-img w-100" alt="..." />
        </div>
      </div>
      <button className="carousel-control-prev" type="button" data-bs-target="#carouselExampleInterval" data-bs-slide="prev">
        <span className="carousel-control-prev-icon" aria-hidden="true"></span>
        <span className="visually-hidden">Previous</span>
      </button>
      <button className="carousel-control-next" type="button" data-bs-target="#carouselExampleInterval" data-bs-slide="next">
        <span className="carousel-control-next-icon" aria-hidden="true"></span>
        <span className="visually-hidden">Next</span>
      </button>
    </div>
  )
}
