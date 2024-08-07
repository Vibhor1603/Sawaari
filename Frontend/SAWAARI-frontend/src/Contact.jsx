/* eslint-disable no-unused-vars */
import React, { useState } from 'react';

import { useNavigate } from 'react-router-dom';

const ContactPage = () => {
    const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    mobile: '',
    feedback: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async(e) => {
    e.preventDefault();
   
    try {
        const response = await fetch(`http://localhost:5000/feedbacks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
        
        if (response.ok) {
          
          console.log("feedback submitted");
          
          navigate('/');
        } else {
          
          console.log("feedback error");
        }
      } catch (error) {
        console.log(error);
      }


    console.log('Form submitted:', formData);
  
    setFormData({ email: '', mobile: '', feedback: '' });
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow contact">
            <div className="card-body ">
              <h2 className="card-title text-center mb-4">Contact Us</h2>
              <p className="text-center  mb-4"><b>We would love to hear from you!</b></p>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email address</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder='enter email address'
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="mobile" className="form-label">Mobile number</label>
                  <input
                    type="tel"
                    className="form-control"
                    id="mobile"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder='enter mobile number'
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="feedback" className="form-label">Your feedback</label>
                  <textarea
                    className="form-control"
                    id="feedback"
                    name="feedback"
                    rows="4"
                    value={formData.feedback}
                    onChange={handleChange}
                    placeholder='enter your feedback'
                    required
                  ></textarea>
                </div>
                
                <div className="d-grid">
                  <button type="submit" className="btn btn-primary contact-submit">
                    Submit Feedback
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;