import React from "react";
import ReactDOM from "react-dom/client";

// Order matters: the token layer defines the custom properties that the base
// layer and every component stylesheet consume.
import "./styles/tokens.css";
import "./styles/base.css";

import App from "./App";
import reportWebVitals from "./reportWebVitals";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root is missing from index.html");
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
