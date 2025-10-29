import { Address, erc20Abi, getContract } from "viem";
import { USDC, WETH } from "../constants/addresses";
import { publicClient } from "../constants/clients";

const checkBalance = async (address: Address, tokenAddress: Address = USDC) => {
    const token = getContract({
      address: tokenAddress,
      abi: erc20Abi,
      client: { public: publicClient },
    });

    const bal = await token.read.balanceOf([address]);
    return bal;
}

const checkUSDCBalance = async (address: Address) => {
    return checkBalance(address, USDC);
}

const checkWETHBalance = async (address: Address) => {
    return checkBalance(address, WETH);
}

export { checkBalance, checkUSDCBalance, checkWETHBalance };