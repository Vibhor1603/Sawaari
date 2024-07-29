const express = require('express')
const {db1 , hotspot_db} = require('../Backend/database')

const home = async(req,res)=>{
    const result = await db1()
    res.send(result)
    //res.render('home.ejs',{result})
}

const hotspots = async(req,res)=>{
    const result = await hotspot_db()
    res.send(result)
}
const routes = async(req,res)=>{
    res.send("I am in routes section ")
}

const ridebuddy = async(req,res)=>{
    res.send("I am in ridebuddy section ")
}
module.exports = {home,hotspots,routes,ridebuddy }