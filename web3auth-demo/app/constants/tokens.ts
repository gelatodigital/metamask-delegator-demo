export interface Token {
  symbol: string;
  name: string;
  balance: string;
  address: string;
  logo: string;
  decimals: number;
}

export const swapTokens: Token[] = [
  {
    symbol: "USDC",
    name: "USD Coin",
    balance: "0",
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    logo: "/usdc.svg",
    decimals: 6,
  },
  {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    balance: "0",
    address: "0x4200000000000000000000000000000000000006",
    logo: "/weth.svg",
    decimals: 18,
  },
];
