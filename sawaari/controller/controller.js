const express = require('express')
const db1 = require('../Backend/database')

const home = async(req,res)=>{
    const result = await db1()
    res.send(result)
    //res.render('home.ejs',{result})
}

const hotspots = async(req,res)=>{
    res.send("I am in hotspot section ")
}
const routes = async(req,res)=>{
    res.send("I am in routes section ")
}

const ridebuddy = async(req,res)=>{
    res.send("I am in ridebuddy section ")
}
module.exports = {home,hotspots,routes,ridebuddy }