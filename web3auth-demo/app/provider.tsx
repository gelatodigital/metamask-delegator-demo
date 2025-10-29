"use client";

import {
  Web3AuthProvider,
} from "@web3auth/modal/react";
import { WagmiProvider } from "@web3auth/modal/react/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Web3AuthContextConfig } from "@web3auth/modal/react";
import { WEB3AUTH_NETWORK } from "@web3auth/modal";
import { toHex } from "viem";
import { baseSepolia } from "viem/chains";

const queryClient = new QueryClient();
const clientId = process.env.NEXT_PUBLIC_CLIENT_ID as string;

const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    accountAbstractionConfig: {
      smartAccountType: "metamask",
      chains: [
        {
          chainId: toHex(baseSepolia.id),
          bundlerConfig: {
            url: `https://api.gelato.digital/bundlers/${baseSepolia.id}/rpc?apiKey=${process.env.NEXT_PUBLIC_GELATO_API_KEY}&sponsored=true`,
          },
        },
      ],
    },
  },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Web3AuthProvider config={web3AuthContextConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </Web3AuthProvider>
  );
}
