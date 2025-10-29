import { Address, encodeFunctionData, erc20Abi } from "viem";
import routerAbi from "../abi/RouterABI";
import { ROUTER, USDC, WETH } from "../constants/addresses";

export const getAllowanceAndSwapData = async (
  amountIn: bigint,
  fee: number,
  minOut: bigint,
  address: Address
) => {
  const allowanceData = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [ROUTER, amountIn],
  });

  const swapData = encodeFunctionData({
    abi: routerAbi,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn: USDC,
        tokenOut: WETH,
        fee,
        recipient: address,
        amountIn,
        amountOutMinimum: minOut,
        sqrtPriceLimitX96: BigInt(0),
      },
    ],
  });

  return { allowanceData, swapData };
};
