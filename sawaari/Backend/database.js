const {MongoClient}  = require('mongodb');
const db1= async()=>{
    try {
        const client = await MongoClient.connect(
            'mongodb://localhost:27017/'
          );
          const coll = client.db('Sawaari').collection('users');
        const result = await coll.findOne({ name: 'Yuvraj Singh'});
        client.close();
        console.log(result);
          return result;

          //const coll = await client.db('Sawaari').collection('users');
          //const result = await coll.findOne({name:'Rohit Sharma'});
          //console.log(result)
          //await client.close();
          //return result.name

          
    } catch (error) {
        return "server error"
    }
}
module.exports = db1