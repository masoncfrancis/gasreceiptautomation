import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import * as Sentry from "@sentry/react";

const runtimeConfig =
  (
    window as typeof window & {
      __RUNTIME_CONFIG__?: Record<string, string | undefined>;
    }
  ).__RUNTIME_CONFIG__ ?? {};

const sentryDsn = runtimeConfig.PUBLIC_SENTRY_DSN || "";
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 1.0,
    debug: false,
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
