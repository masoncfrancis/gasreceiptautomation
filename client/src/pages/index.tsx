import GasLogForm from "@/components/GasLogForm";
import LoginButton from "@/components/LoginButton";
import { Auth0Provider } from "@auth0/auth0-react";


export default function Home() {
  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}
      redirectUri={process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI}
      >
      <LoginButton />
      <h1 className="text-3xl font-bold underline">
        Hello world!
      </h1>
      
      <GasLogForm />
    </Auth0Provider>
  );
}
