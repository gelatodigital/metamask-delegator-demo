"use client";

import { useState, useEffect } from "react";
import { useWeb3Auth } from "@web3auth/modal/react";
import { parseUnits, formatUnits } from "viem";
import { checkUSDCBalance, checkWETHBalance } from "../helpers/balance";
import { ROUTER, USDC, WETH } from "../constants/addresses";
import { findWorkingFee, quoteOut } from "../helpers/fees";
import { getWalletClient } from "../constants/clients";
import { getAllowanceAndSwapData } from "../helpers/encodeData";
import { truncateAddress, copyToClipboard, formatBalance, isValidPositiveNumber, parseEnvNumberList } from "../helpers/utils";
import { retryWithBackoff } from "../helpers/retry";
import { swapTokens, Token } from "../constants/tokens";
import { Web3Auth } from "@web3auth/modal";

export default function SwapInterface() {
  const { web3Auth } = useWeb3Auth();
  const walletClient = getWalletClient(web3Auth as Web3Auth);
  const [fromToken, setFromToken] = useState<Token>(swapTokens[0]); // USDC
  const [toToken, setToToken] = useState<Token>(swapTokens[1]); // WETH
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userAddress, setUserAddress] = useState<string>("");
  const [eoaAddress, setEoaAddress] = useState<string>("");
  const [transactionHash, setTransactionHash] = useState<string>("");
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [balanceError, setBalanceError] = useState<string>("");
  const [lastBalanceFetch, setLastBalanceFetch] = useState<number>(0);
  const [copySuccess, setCopySuccess] = useState<string>("");
  const [isCalculatingQuote, setIsCalculatingQuote] = useState<boolean>(false);
  const [quoteRate, setQuoteRate] = useState<number>(0);
  const [isInsufficientBalance, setIsInsufficientBalance] = useState<boolean>(false);

  useEffect(() => {
  const fetchUserData = async () => {
    if (web3Auth?.connected && !userAddress) {
      try {
        const addresses = await walletClient.getAddresses();
        if (addresses && addresses.length > 0) {
          setUserAddress(addresses[0]); // Smart account address
          if (addresses.length > 1) {
            setEoaAddress(addresses[1]); // EOA address
          }
          await fetchBalances(addresses[0]);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setBalanceError("Failed to fetch user data");
      }
    }
  };

    fetchUserData();
  }, [web3Auth?.connected, userAddress]);

  const fetchBalances = async (address: string, forceRefresh = false) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastBalanceFetch;
    
    if (!forceRefresh && timeSinceLastFetch < 30000) {
      console.log("Rate limited: Balance fetch too recent");
      return;
    }

    setIsLoadingBalances(true);
    setBalanceError("");
    
    try {
      const usdcBalance = await retryWithBackoff(() => checkUSDCBalance(address as `0x${string}`));
      const formattedUsdcBalance = formatUnits(usdcBalance, fromToken.decimals);

      const wethBalance = await retryWithBackoff(() => checkWETHBalance(address as `0x${string}`));
      const formattedWethBalance = formatUnits(wethBalance, toToken.decimals);

      setFromToken(prev => ({ ...prev, balance: formattedUsdcBalance }));
      setToToken(prev => ({ ...prev, balance: formattedWethBalance }));
      setLastBalanceFetch(now);
      
      if (fromAmount) {
        checkInsufficientBalance(fromAmount);
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
      setBalanceError("Failed to fetch balances. Please try again later.");
    } finally {
      setIsLoadingBalances(false);
    }
  };

  const handleCopyToClipboard = async (text: string, type: string) => {
    try {
      await copyToClipboard(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(""), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const calculateQuote = async (amountIn: string) => {
    if (!isValidPositiveNumber(amountIn) || !userAddress) {
      setToAmount("");
      setQuoteRate(0);
      return;
    }

    setIsCalculatingQuote(true);
    try {
      const FEES_TO_TRY = parseEnvNumberList(process.env.FEE_LIST, "500,3000");
      
      const combo = await findWorkingFee(USDC, WETH, FEES_TO_TRY);
      if (!combo) {
        throw new Error("No USDC/WETH v3 pool found");
      }
      
      const { fee } = combo;
      const amountInWei = parseUnits(amountIn, fromToken.decimals);
      const quoteOutAmount = await quoteOut(amountInWei, USDC, WETH, fee, userAddress as `0x${string}`);
      
      if (quoteOutAmount === BigInt(0)) {
        throw new Error("No liquidity available");
      }
      
      const formattedOutAmount = formatUnits(quoteOutAmount, toToken.decimals);
      setToAmount(formattedOutAmount);
      
      const rate = Number(formattedOutAmount) / Number(amountIn);
      setQuoteRate(rate);
      
    } catch (error) {
      console.error("Quote calculation failed:", error);
      setToAmount("");
      setQuoteRate(0);
      setBalanceError("Failed to get quote. Please try again.");
    } finally {
      setIsCalculatingQuote(false);
    }
  };

  const checkInsufficientBalance = (amount: string) => {
    if (!amount || !isValidPositiveNumber(amount)) {
      setIsInsufficientBalance(false);
      return;
    }
    
    const inputAmount = parseFloat(amount);
    const availableBalance = parseFloat(fromToken.balance);
    setIsInsufficientBalance(inputAmount > availableBalance);
  };

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    checkInsufficientBalance(value);
    
    if (isValidPositiveNumber(value)) {
      calculateQuote(value);
    } else {
      setToAmount("");
      setQuoteRate(0);
    }
  };

  const handleMaxClick = () => {
    setFromAmount(fromToken.balance);
    checkInsufficientBalance(fromToken.balance);
  };

  const handleSwap = async () => {
    setIsLoading(true);
    setBalanceError("");
    
    try {
      const address = await walletClient.getAddresses();
      const SLIPPAGE_BPS = BigInt(process.env.SLIPPAGE_BPS ?? "50");
      const FEES_TO_TRY = parseEnvNumberList(process.env.FEE_LIST, "500,3000");
      const bundler = await createBundlerClient();
      if (!bundler) {
        throw new Error("Bundler client not available");
      }
      const amountIn = parseUnits(fromAmount, 6);

      const bal = await checkUSDCBalance(address[0]);
      if (bal < amountIn) {
        throw new Error("Insufficient balance");
      }

      const combo = await findWorkingFee(USDC, WETH, FEES_TO_TRY);
      if (!combo)
        throw new Error(
          "No USDC/WETH v3 pool found at the tried fee tiers on Base."
        );
      const { fee } = combo;
      console.log(`Using fee tier: ${fee}`);

      const out = await quoteOut(amountIn, USDC, WETH, fee, address[0]);
      if (out === BigInt(0))
        throw new Error(
          "Quote returned 0 — likely no liquidity in the discovered pool."
        );
      const minOut = (out * (BigInt(10_000) - BigInt(SLIPPAGE_BPS))) / BigInt(10_000);
      console.log(
        `Quote: ${out.toString()} wei WETH; minOut (${SLIPPAGE_BPS} bps): ${minOut.toString()}`
      );

      const { allowanceData, swapData } = await getAllowanceAndSwapData(amountIn, fee, minOut, address[0]);

      const userOpHash = await bundler.sendUserOperation({
        calls: [
          {
            to: USDC,
            data: allowanceData,
            value: BigInt(0),
          },
          {
            to: ROUTER,
            data: swapData,
            value: BigInt(0),
          },
        ],
        maxFeePerGas: BigInt(0),
        maxPriorityFeePerGas: BigInt(0),
      });

      const receipt = await bundler.waitForUserOperationReceipt({
        hash: userOpHash,
      });
      
      setTransactionHash(receipt.receipt.transactionHash);
      await fetchBalances(address[0], true);
      
      console.log(`Transaction successful: ${receipt.receipt.transactionHash}`);
    } catch (error) {
      console.error("Swap failed:", error);
      setBalanceError(error instanceof Error ? error.message : "Swap failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const createBundlerClient = async () => {
    const accountAbstractionProvider = web3Auth?.accountAbstractionProvider;

    if (!accountAbstractionProvider) {
      console.error("Account abstraction provider not available");
      return;
    }

    const bundlerClient = accountAbstractionProvider.bundlerClient;
    const smartAccount = accountAbstractionProvider.smartAccount;

    if (!bundlerClient || !smartAccount) {
      console.error("Bundler client or smart account not available");
      return;
    }

    return bundlerClient;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-card-foreground">ERC 4337</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-secondary rounded-lg px-3 py-2">
                <span className="text-secondary-foreground text-sm font-medium">
                  {"Connected"}
                </span>
              </div>
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer" onClick={async() => await web3Auth?.logout()}>
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-20">
        <div className="flex flex-col lg:flex-row justify-center gap-6">
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="bg-card rounded-xl shadow-lg border border-border p-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-card-foreground mb-3">Token Swap</h2>
            <p className="text-muted-foreground text-sm">Exchange USDC for WETH with zero gas fees</p>
          </div>

          {balanceError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700 text-sm">{balanceError}</span>
                <button
                  onClick={() => userAddress && fetchBalances(userAddress, true)}
                  className="text-red-600 hover:text-red-800 text-sm underline cursor-pointer"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">From</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    Available: {isLoadingBalances ? "Loading..." : formatBalance(fromToken.balance, fromToken.decimals)} {fromToken.symbol}
                  </span>
                  <button
                    onClick={() => userAddress && fetchBalances(userAddress, true)}
                    disabled={isLoadingBalances}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="Refresh balance"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-card border border-border rounded-lg px-3 py-2">
                  <img 
                    src={fromToken.logo} 
                    alt={fromToken.symbol} 
                    className="w-5 h-5"
                    onError={(e) => console.error("Image failed to load:", fromToken.logo, e)}
                    onLoad={() => console.log("Image loaded successfully:", fromToken.logo)}
                  />
                  <span className="font-medium text-card-foreground">{fromToken.symbol}</span>
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    value={fromAmount}
                    onChange={(e) => handleFromAmountChange(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-transparent text-2xl font-semibold text-card-foreground placeholder-muted-foreground focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleMaxClick}
                  className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">To</span>
                <span className="text-sm text-muted-foreground">
                  Available: {isLoadingBalances ? "Loading..." : formatBalance(toToken.balance, 10)} {toToken.symbol}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-card border border-border rounded-lg px-3 py-2">
                  <img 
                    src={toToken.logo} 
                    alt={toToken.symbol} 
                    className="w-5 h-5"
                    onError={(e) => console.error("Image failed to load:", toToken.logo, e)}
                    onLoad={() => console.log("Image loaded successfully:", toToken.logo)}
                  />
                  <span className="font-medium text-card-foreground">{toToken.symbol}</span>
                </div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={toAmount}
                    readOnly
                    placeholder={isCalculatingQuote ? "Calculating..." : "0.0"}
                    className="w-full bg-transparent text-2xl font-semibold text-card-foreground placeholder-muted-foreground focus:outline-none"
                  />
                  {isCalculatingQuote && (
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                      <svg className="animate-spin h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {fromAmount && toAmount && (
              <div className="bg-accent rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Exchange Rate</span>
                  <span className="text-card-foreground">
                    {isCalculatingQuote ? "Calculating..." : quoteRate > 0 ? `1 USDC = ${quoteRate.toFixed(6)} WETH` : "Enter amount"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Network Fee</span>
                  <span className="text-success">Sponsored</span>
                </div>
              </div>
            )}

            {transactionHash && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-800 font-medium">Transaction Successful!</span>
                </div>
                <div className="text-sm text-green-700 mb-2">
                  Transaction Hash: {truncateAddress(transactionHash)}
                </div>
                <a
                  href={`https://sepolia.basescan.org/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  <span>View on Explorer</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}

            <button
              onClick={handleSwap}
              disabled={!fromAmount || !toAmount || isLoading || isCalculatingQuote || isInsufficientBalance}
              className={`w-full font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 disabled:cursor-not-allowed cursor-pointer ${
                isInsufficientBalance 
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                  : 'bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Swapping...</span>
                </>
              ) : isCalculatingQuote ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Getting Quote...</span>
                </>
              ) : isInsufficientBalance ? (
                <span>Insufficient Balance</span>
              ) : (
                <span>Swap USDC for WETH</span>
              )}
            </button>
          </div>
        </div>
          </div>
          
          <div className="w-full max-w-72 mx-auto lg:mx-0">
            <div className="bg-card rounded-xl shadow-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Account Addresses</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">EOA Address</label>
                  <div className="bg-muted rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-sm font-mono text-card-foreground">
                      {eoaAddress ? truncateAddress(eoaAddress) : "Not available"}
                    </span>
                    {eoaAddress && (
                      <button
                        onClick={() => handleCopyToClipboard(eoaAddress, "eoa")}
                        className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-2"
                        title="Copy EOA address"
                      >
                        {copySuccess === "eoa" ? (
                          <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Smart Account</label>
                  <div className="bg-muted rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-sm font-mono text-card-foreground">
                      {userAddress ? truncateAddress(userAddress) : "Loading..."}
                    </span>
                    {userAddress && (
                      <button
                        onClick={() => handleCopyToClipboard(userAddress, "smart")}
                        className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-2"
                        title="Copy smart account address"
                      >
                        {copySuccess === "smart" ? (
                          <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </main>

      {copySuccess && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">
            {copySuccess === "smart" ? "Smart account address copied!" : "EOA address copied!"}
          </span>
        </div>
      )}
    </div>
  );
}

