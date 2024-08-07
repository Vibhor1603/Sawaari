const express =  require('express')
const router = require('./router/route')
const cors = require('cors')
const app = express()
require('dotenv').config()
const port = 5000


 
app.use(cors())
app.use(express.json())
app.use('/',router)
app.listen(port,()=>{
    console.log(`app is listening on port ${port}`)
    })
   