import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

export const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);

export const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(),
});
