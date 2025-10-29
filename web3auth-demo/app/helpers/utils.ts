export const truncateAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error("Failed to copy:", error);
    throw new Error("Failed to copy to clipboard");
  }
};

export const formatBalance = (balance: string, decimals: number = 6): string => {
  if (!balance || balance === "0") return "0";
  const num = parseFloat(balance);
  return num.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: decimals 
  });
};

export const isValidPositiveNumber = (value: string): boolean => {
  return value !== "" && !isNaN(Number(value)) && Number(value) > 0;
};

export const parseEnvNumberList = (envVar: string | undefined, defaultValue: string): number[] => {
  return (envVar ?? defaultValue)
    .split(",")
    .map((s) => Number(s.trim()))
    .filter(Boolean);
};
