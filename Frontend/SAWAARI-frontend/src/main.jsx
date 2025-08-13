import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "leaflet/dist/leaflet.css";
import Authstate from "./AuthContext.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Authstate>
        <App />
      </Authstate>
    </ErrorBoundary>
  </React.StrictMode>
);
