import { getAddress } from "viem";

// Uniswap V3 - Base Sepolia
const FACTORY = getAddress("0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24");
const ROUTER = getAddress("0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4");
const QUOTER = getAddress("0xC5290058841028F1614F3A6F0F5816cAd0df5E27");

const USDC = getAddress("0x036CbD53842c5426634e7929541eC2318f3dCF7e"); // 6 decimals
const WETH = getAddress("0x4200000000000000000000000000000000000006"); // 18 decimals

export { FACTORY, ROUTER, QUOTER, USDC, WETH };