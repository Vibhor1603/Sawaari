const express =  require('express')
const path = require('path')
const router = require('./router/route')
const cors = require('cors')
const app = express()
const port = 3000

 
app.use(cors())
app.use(express.json())
app.use('/',router)
app.listen(port,()=>{
    console.log(`app is listening on port ${port}`)
    })
   