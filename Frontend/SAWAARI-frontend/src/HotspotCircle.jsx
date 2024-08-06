// /* eslint-disable no-unused-vars */
// /* eslint-disable react/prop-types */
// import React from 'react';
// import { Circle, Popup } from 'react-leaflet';

// function HotspotCircle({ item, clickHandler }) {
//   const circleOptions = {
//     fillOpacity: 0.5,
//   };

//   return (
//     <Circle
//       key={item._id}
//       center={[item.latitude, item.longitude]}
//       pathOptions={{ ...circleOptions, fillColor: item.color_code }}
//       radius={200}
//     >
//       <Popup>
//         <div className="card mb-4 destinations" style={{ width: '13rem' }}>
//           <div className="card-body">
//             <p className="card-text">{`${item.name}: This hotspot will go to -`}</p>
//             {item.destinations.map((result) => (
//               <div key={result.name}>
//                 <ul>
//                   <li>
//                     <button onClick={() => clickHandler(result.latitude, result.longitude)}>
//                       {result.name}
//                     </button>
//                     , estimated fare is {result.estimated_fare}
//                   </li>
//                 </ul>
//               </div>
//             ))}
//           </div>
//         </div>
//       </Popup>
//     </Circle>
//   );
// }

// export default HotspotCircle;