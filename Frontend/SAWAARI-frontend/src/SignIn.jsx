import SigninForm from "./SigninForm";
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";
export default function SignIn() {
  const [userinfo, setuserinfo] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();
  const handleInput = (event) => {
    let targetname = event.target.name;
    let value = event.target.value;
    setuserinfo({ ...userinfo, [targetname]: value });
  };
  const { saveToken } = useContext(AuthContext);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: await JSON.stringify(userinfo),
      });
      const x = await response.json();
     
      if (x.valid == 1) {
        saveToken(x.token);
        navigate("/");
      } else {
        alert("Not Valid User");
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <SigninForm
        userinfo={userinfo}
        handleInput={handleInput}
        handleSubmit={handleSubmit}
      />
    </>
  );
}