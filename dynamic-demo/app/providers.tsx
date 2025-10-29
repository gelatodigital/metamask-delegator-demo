"use client";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { WagmiProvider, createConfig, http } from "wagmi";
import { baseSepolia } from "viem/chains";

const queryClient = new QueryClient();
export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_APP_ID!,
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      <WagmiProvider
        config={createConfig({
          chains: [baseSepolia],
          transports: {
            [baseSepolia.id]: http(),
          },
        })}
      >
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>{children}</DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
}
