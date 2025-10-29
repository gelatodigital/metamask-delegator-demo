# Dynamic Wallet Integration Demo

A Next.js application demonstrating token swapping functionality using Dynamic as wallet provider with MetaMask delegation support.

## Overview

This demo showcases a decentralized token swap interface that integrates with Dynamic for wallet management and supports MetaMask's EIP-7702 delegation feature. Users can swap between USDC and WETH tokens on Base Sepolia testnet using smart accounts.

## Prerequisites

- Node.js 18+ 
- Yarn package manager
- MetaMask wallet with Base Sepolia testnet configured
- Testnet USDC and WETH tokens

## Gelato API Key Setup

For sponsored transactions (gasless), you'll need a API Key:

1. Visit the [Gelato App](https://app.gelato.cloud/)
2. Create an account and generate a API Key for Base Sepolia
3. Add the key to your `.env` file
4. Need help? Check out our [How to Create a Sponsor API Key Guide](https://docs.gelato.cloud/smart-wallet-sdk/how-to-guides/create-a-api-key)

Example `.env` file:
```
NEXT_PUBLIC_GELATO_API_KEY=your_gelato_api_key_here
```

## Installation

1. Clone the repository and navigate to the dynamic-demo directory:
```bash
cd dynamic-demo
```

2. Install dependencies:
```bash
yarn install
```

3. Start the development server:
```bash
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Connect Wallet**: Click "Connect with Dynamic" to authenticate with Dynamic
2. **Select Tokens**: Choose from USDC and WETH token pairs
3. **Enter Amount**: Input the amount you want to swap
4. **Review Quote**: Check the exchange rate and fees
5. **Execute Swap**: Confirm the transaction to complete the swap


## Project Structure

```
app/
├── components/          # React components
│   ├── LoginInterface.tsx
│   └── SwapInterface.tsx
├── constants/           # Configuration and constants
│   ├── addresses.ts
│   ├── metamask.ts
│   └── tokens.ts
├── helpers/            # Utility functions
│   ├── balance.ts
│   ├── encodeData.ts
│   ├── fees.ts
│   ├── retry.ts
│   └── utils.ts
└── abi/               # Smart contract ABIs
    ├── FactoryABI.ts
    ├── QouterABI.ts
    └── RouterABI.ts
```

## Configuration

The application is configured for Base Sepolia testnet. Key configuration files:

- `constants/addresses.ts`: Contract addresses and router configuration
- `constants/metamask.ts`: MetaMask delegation settings
- `constants/tokens.ts`: Token definitions and swap pairs

## Development

To build for production:

```bash
yarn build
yarn start
```

## License

This project is for demonstration purposes only.