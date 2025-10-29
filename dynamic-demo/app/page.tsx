"use client";
import SwapInterface from "./components/SwapInterface";
import LoginInterface from "./components/LoginInterface";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

export default function Home() {
  const { primaryWallet } = useDynamicContext();
  return primaryWallet ? <SwapInterface /> : <LoginInterface />;
}
