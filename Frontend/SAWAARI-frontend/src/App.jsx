/* eslint-disable no-unused-vars */
// App.jsx
import {React,useContext} from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './navbar';

import Hotspots from './hotspots';
import Footer from './footer';
import Root from './Root';
import Routeinfo from './RouteInfo';
import RideBuddy from './RideBuddy';
import SignupParent from './SignupParent';
import SignIn from './SignIn'
import { AuthContext } from './AuthContext';
import Logout from './Logout'
import Contact from './Contact';





function App() {
const {hotspot}= useContext(AuthContext)
const {token}=useContext(AuthContext)
//   const [hotspot,setHotspots]= React.useState([])

//   React.useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const response = await fetch('http://localhost:5000/hotspots');
//         const data = await response.json();
//         setHotspots(data);
//       } catch (error) {
//         console.error('Error fetching data:', error);
//       }
//     };
  
//     fetchData();
//   }, []);


    return (
        <Router>
            <Navbar />
            <Routes>
              <Route index element={<Root />} />
              <Route path="/home" element={<Root />} />
              <Route path="/hotspots" element={<Hotspots 
              hotspot={hotspot}
              />} />
              <Route path="/routes" element={<Routeinfo hotspot={hotspot}
            
              />} />
              <Route
  exact
  path="/ridebuddy"
  element={
    token ? (
      <RideBuddy hotspot={hotspot} />
    ) : (
      <SignIn replace to={"/"} />
    )
  }   
/>   <Route path="/signin" element={<SignIn />}></Route>
     <Route path="/signup" element={<SignupParent />}></Route>
     <Route path="/logout" element={<Logout />}></Route>
     <Route path="/feedbacks" element={<Contact />} />
     </Routes>
     <Footer />  
     </Router>
    );
}

export default App;
