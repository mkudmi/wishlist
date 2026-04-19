import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/core.css";
import "./styles/landing.css";
import "./styles/dashboard.css";
import "./styles/share-sheet.css";
import "./styles/modals.css";
import "./styles/not-found.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
