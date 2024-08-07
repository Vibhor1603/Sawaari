/* eslint-disable no-unused-vars */
import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import Signup from "./Signup";

export default function SignupParent() {
  const navigate = useNavigate();
  
  const [userinfo, setuserinfo] = useState({
    name: "",
    mobile: "",
    email: "",
    password: "",
  });

  const handleInput = (event) => {
    let targetname = event.target.name;
    let value = event.target.value;
    setuserinfo({ ...userinfo, [targetname]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userinfo),
      });
      
      if (response.ok) {
        // Signup was successful
        console.log("Signup successful");
        // Navigate to the home page
        navigate('/');
      } else {
        // Handle signup failure
        console.log("Signup failed");
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Signup
      handleInput={handleInput}
      handleSubmit={handleSubmit}
      userinfo={userinfo}
    />
  );
}