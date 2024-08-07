/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { createContext, useState,React , useEffect} from "react";

export const AuthContext = createContext("");

const Authstate = (props) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  
  const saveToken = (token) => {
    setToken(...token, token);
    localStorage.setItem("token", token);
  };

  const [hotspot,setHotspots]= useState([])

 useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5000/hotspots');
        const data = await response.json();
        setHotspots(data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
  
    fetchData();
  }, []);

  const deleteToken = () => {
    setToken(null);
    localStorage.removeItem("token");
    return;
  };
  return (
    <AuthContext.Provider value={{ token, saveToken, deleteToken, hotspot }}>
      {props.children}
    </AuthContext.Provider>
  );
};
export default Authstate;