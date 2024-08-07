const express = require('express')
const {ridebuddy_db , rideInfo_db} = require('../Backend/database')
const {generateAccessToken,verifyAccessToken}  = require('../Backend/jwtToken')
const {MongoClient}  = require('mongodb');
require('dotenv').config()
const bcrypt = require('bcrypt');

const home = async(req,res)=>{
    res.send("home")
    
}

const hotspots = async(req,res)=>{
    try {
        const client = await MongoClient.connect(
          'mongodb://localhost:27017/', 
          
        );
        const coll = client.db('Sawaari').collection('hotspots');
        const result = await coll.find({}).toArray(); 
        client.close();
    
        res.send(result)
      } catch (error) {
        console.error("Error connecting to the database or fetching documents:", error);
        return "server error";
      }
}
const feedbacks = async(req,res)=>{
    try {
        const client = await MongoClient.connect(
            'mongodb://localhost:27017/', 
          
        );
        const coll = client.db('Sawaari').collection('feedbacks');
        const result = await coll.insertOne(req.body)
        client.close();
       console.log(result)
       res.status(200).send("ok")
      } catch (error) {
       res.send(error)
      }
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
const signIn = async (req,res)=>{
    try {
      const client = await MongoClient.connect('mongodb://localhost:27017/');
      const coll = client.db('Sawaari').collection('users');
      const result = await coll.findOne({email:req.body.email})
      client.close();
      if(result){
        const isvaliduser = await bcrypt.compare(req.body.password,result.password);
        if(isvaliduser){
          const token = await generateAccessToken(req.body.email);
          console.log(token)
          return res.json({valid:1,token});
        }
        else
          return res.json({valid:0});
      }
      else{
        return res.json({valid:0})
      }
    } catch (error) {
      return res.send("Internal Server Error");
    }
  
  }


const signUp = async (req,res)=>{
    try {
      const client = await MongoClient.connect( 'mongodb://localhost:27017/');
      const coll = client.db('Sawaari').collection('users');
      const oldUser = await coll.findOne({email:req.body.email})
      console.log(oldUser)
      if(oldUser){
       return res.send("User Already Exists");
      }
      const data = req.body;
      
      data.password = await bcrypt.hash(data.password,5)
      await coll.insertOne(data);
      client.close();
     return res.send("Signup Ok Now u can Login")
    } catch (error) {

      res.send("Internal Server Error");
    }
  
  }
module.exports = {home,hotspots,feedbacks,ridebuddy,findmatch,signIn,signUp }