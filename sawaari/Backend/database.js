const {MongoClient}  = require('mongodb');


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

module.exports = {ridebuddy_db}