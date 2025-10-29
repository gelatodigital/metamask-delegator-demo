"use client";
import { useWeb3Auth, useWeb3AuthConnect } from "@web3auth/modal/react";
import LoginInterface from "./components/LoginInterface";
import SwapInterface from "./components/SwapInterface";

export default function Home() {
  const { status } = useWeb3Auth();
  const { isConnected } = useWeb3AuthConnect();

  if (!isConnected || status !== "connected") {
    return <LoginInterface />;
  }

  return <SwapInterface />;
}
