import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import Authstate from "./AuthContext.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <Authstate>
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </Authstate>
  </ErrorBoundary>
);
