import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { isDesktopRuntime } from "./bridge";
import "./index.css";

if (isDesktopRuntime()) {
  document.documentElement.classList.add("desktop-shell");
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("QuickSave root element is missing.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
