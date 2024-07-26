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
    // app.use( express.static(path.join(__dirname,"/public/css")))
    // app.use( express.static(path.join(__dirname,"/public/js")))


    // app.set("views", path.join(__dirname,"/views"))
    
    // app.set("view engine", "ejs")
    
    
    //create a website using bootstrap like abesit.edu.in(image size - width=900,height =400)