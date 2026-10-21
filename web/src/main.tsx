// Self-hosted (not from Google's servers), so loading the page sends nobody's IP to a third party.
import "@fontsource/michroma/400.css";
import "./theme.css";
import "./tokens.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { openLinks } from "./ui/link";

openLinks();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
