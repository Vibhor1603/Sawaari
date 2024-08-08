/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React from 'react';

export default function Testimonials({ testimonials }) {
    return (
        <>
        <h3 className='text-center'>Some user testimonials</h3>
        <div className="container test-box">
            {testimonials.map((testimonial, index) => (
                <div className="card mb-4 testimonial" key={index} style={{ width: '18rem' }}>
                    <img src={testimonial.imageSrc} className="card-img-top" alt={testimonial.name} />
                    <div className="card-body">
                        <h5 className="card-title">{testimonial.name}</h5>
                        <p className="card-text">{testimonial.text}</p>
                    </div>
                </div>
            ))}
        </div>
        </>
    );
}
