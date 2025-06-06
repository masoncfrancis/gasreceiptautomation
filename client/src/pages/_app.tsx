import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Auth0Provider } from "@auth0/auth0-react";

export default function App({ Component, pageProps }: AppProps) {
  if (!process.env.NEXT_PUBLIC_AUTH0_DOMAIN || !process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID) {
    throw new Error("Missing required environment variables for Auth0Provider.");
  }

  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI || "",
        useRefreshTokens: true,
        useRefreshTokensFallback: false,
        cacheLocation: "localstorage",
      }}
    >
      <Component {...pageProps} />
    </Auth0Provider>
  );
}