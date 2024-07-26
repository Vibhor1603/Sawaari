/* eslint-disable no-unused-vars */
// App.jsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './navbar';
import About from './about';
import Hotspots from './hotspots';
import Testimonials from './testimonials';
import Footer from './footer';
import Root from './Root';


function App() {
    return (
        <Router>
            <Navbar />
            <Routes>
              <Route path='/' element={<Root />} />
              <Route path="/hotspots" element={<Hotspots />} />
            </Routes>            
        </Router>
    );
}

export default App;
