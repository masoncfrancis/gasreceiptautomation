'use client';

import GasLogForm from "@/components/GasLogForm";
import LoginLanding from "@/components/LoginLanding";
import LoadingScreen from "@/components/LoadingScreen";
import { useAuth0 } from "@auth0/auth0-react";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return <LoadingScreen />;

  return isAuthenticated ? <GasLogForm /> : <LoginLanding />;
}