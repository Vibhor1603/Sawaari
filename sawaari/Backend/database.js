const {MongoClient}  = require('mongodb');

const hotspot_db = async () => {
  try {
    const client = await MongoClient.connect(
      'mongodb://localhost:27017/', 
      
    );
    const coll = client.db('Sawaari').collection('hotspots');
    const result = await coll.find({}).toArray(); 
    client.close();

    return result;
  } catch (error) {
    console.error("Error connecting to the database or fetching documents:", error);
    return "server error";
  }
};

const ridebuddy_db = async (data) => {
  try {
    const client = await MongoClient.connect(
      'mongodb://localhost:27017/', 
      
    );
    const coll = client.db('Sawaari').collection('rideBuddy');
    const result = await coll.insertOne(data) 
    client.close();
   
   
  } catch (error) {
    console.error("Error connecting to the database or fetching documents:", error);
    return "server error";
  }
};


const rideInfo_db = async () => {
  try {
    const client = await MongoClient.connect(
      'mongodb://localhost:27017/', 
      
    );
    const coll = client.db('Sawaari').collection('rideBuddy');
    const result = await coll.find({}).toArray()
    client.close();
   console.log(result)
    return result;
  } catch (error) {
    console.error("Error connecting to the database or fetching documents:", error);
    return "server error";
  }
};


module.exports = {hotspot_db,ridebuddy_db, rideInfo_db}