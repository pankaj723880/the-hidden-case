import React from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App";
import InstallPrompt from "./components/InstallPrompt";
import "./app/globals.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#faf7f2",
          color: "#2c2416",
          border: "1px solid #d4c9b5",
          fontFamily: "var(--font-garamond), Georgia, serif",
          fontSize: "0.88rem",
          borderRadius: "4px",
          boxShadow: "0 4px 16px rgba(44, 36, 22, 0.12)",
        },
        success: { iconTheme: { primary: "#3d6b45", secondary: "#faf7f2" } },
        error: { iconTheme: { primary: "#9b3030", secondary: "#faf7f2" } },
      }}
    />
    <InstallPrompt />
    <App />
  </React.StrictMode>,
);
