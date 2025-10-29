import { Web3Auth } from "@web3auth/modal";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { baseSepolia } from "viem/chains";

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export const getWalletClient = (web3auth: Web3Auth) => {
  const provider = web3auth.provider;
  return createWalletClient({
    transport: custom(provider as any),
  });
};