import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";

import ErrorBoundary from "./components/ErrorBoundary";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <ErrorBoundary>
      {googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          <App />
        </GoogleOAuthProvider>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </React.StrictMode>
);