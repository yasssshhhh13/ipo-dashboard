import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { initAnalytics } from "./analytics.js";

initAnalytics();

// Hide crawlable prerender summary once the SPA takes over (meta/JSON-LD stay in <head>).
const seoContent = document.getElementById("seo-content");
if (seoContent) {
  seoContent.setAttribute("hidden", "");
  seoContent.style.display = "none";
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
