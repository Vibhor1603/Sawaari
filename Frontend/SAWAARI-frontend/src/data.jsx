/* eslint-disable no-unused-vars */
import React from "react"
export default function Data(){
React.useEffect(()=>{
    const fetchData =async()=>{
        const data = await fetch('http://localhost:3000/')
        const json = await data.json()
        console.log(json)
        document.getElementById('data-received').innerText= JSON.stringify(json.name)
        
      }
      fetchData()

},[])
    
    
    return(
        <p id="data-received">...loading</p>
    )
}