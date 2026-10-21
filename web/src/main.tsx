// Self-hosted (not from Google's servers), so loading the page sends nobody's IP to a third party.
import "@fontsource/michroma/400.css";
import "./theme.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
