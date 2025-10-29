import { Address, getContract, zeroAddress } from "viem";
import { FACTORY, QUOTER } from "../constants/addresses";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import factoryAbi from "../abi/FactoryABI";
import quoterAbi from "../abi/QouterABI";

const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
});

async function findWorkingFee(
  tokenA: `0x${string}`,
  tokenB: `0x${string}`,
  fees: number[]
): Promise<{ fee: number; pool: `0x${string}` } | null> {
  const f = getContract({
    address: FACTORY,
    abi: factoryAbi,
    client: { public: publicClient },
  });
  for (const fee of fees) {
    const pool = (await f.read.getPool([tokenA, tokenB, fee])) as `0x${string}`;
    if (pool !== zeroAddress) return { fee, pool };
  }
  return null;
}

async function quoteOut(
  amountIn: bigint,
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  fee: number,
  address: Address
): Promise<bigint> {
  const { result } = await publicClient.simulateContract({
    address: QUOTER,
    abi: quoterAbi,
    functionName: "quoteExactInputSingle",
    args: [{ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: BigInt(0) },],
    account: address,
  });
  const [amountOut] = result as readonly [bigint, bigint, number, bigint];
  return amountOut;
}

export { findWorkingFee, quoteOut };
