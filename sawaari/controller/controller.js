const express = require('express')
const {ridebuddy_db , hotspot_db, rideInfo_db} = require('../Backend/database')

const home = async(req,res)=>{
    console.log("home")
    res.send("home")
    //res.render('home.ejs',{result})
}

const hotspots = async(req,res)=>{
    const result = await hotspot_db()
    res.send(result)
}
const routes = async(req,res)=>{
    ridebuddy_db(req.body)
}

const ridebuddy = async(req,res)=>{
   await ridebuddy_db(req.body)
   res.status(200).send("ok")
}

const findmatch = async(req,res)=>{
    const result  = await rideInfo_db()
    res.json(result)
    console.log(result)
}
module.exports = {home,hotspots,routes,ridebuddy,findmatch }