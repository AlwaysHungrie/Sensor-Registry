"use client";

import {
  address,
  createSolanaRpc,
  createTransactionMessage,
  generateKeyPairSigner,
  pipe,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  createNoopSigner,
  setTransactionMessageFeePayerSigner,
  getTransactionEncoder,
  flattenInstructionPlan,
  isSingleInstructionPlan,
} from "@solana/kit";
import { getCreateMintInstructionPlan } from "@solana-program/token";
import type { ConnectedStandardSolanaWallet } from "@privy-io/js-sdk-core";

export const TOKEN_DECIMALS = 9;
const DEVNET_RPC = "https://api.devnet.solana.com";
const SOLANA_DEVNET_CHAIN = "solana:devnet" as const;

export type CreateSensorTokenResult = {
  mintAddress: string;
  signature: string;
};

export async function createSensorToken(
  wallet: ConnectedStandardSolanaWallet
): Promise<CreateSensorTokenResult> {
  const rpc = createSolanaRpc(DEVNET_RPC as `https://${string}`);

  const { value: latestBlockhash } = await rpc
    .getLatestBlockhash({ commitment: "confirmed" })
    .send();

  const mintSigner = await generateKeyPairSigner();
  const walletAddress = address(wallet.address);
  const walletNoop = createNoopSigner(walletAddress);

  const plan = getCreateMintInstructionPlan({
    payer: walletNoop,
    newMint: mintSigner,
    decimals: TOKEN_DECIMALS,
    mintAuthority: walletAddress,
    freezeAuthority: walletAddress,
  });

  const flatPlans = flattenInstructionPlan(plan);
  const instructions = flatPlans
    .filter(isSingleInstructionPlan)
    .map((p) => p.instruction);

  // Build transaction message — use unknown→any casts to handle recursive generic widening
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let txMessage: any = pipe(
    createTransactionMessage({ version: 0 }),
    (msg) => setTransactionMessageFeePayerSigner(walletNoop, msg),
    (msg) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, msg)
  );

  for (const ix of instructions) {
    txMessage = appendTransactionMessageInstruction(ix, txMessage);
  }

  // Mint keypair signs; wallet noop leaves empty slot for Privy to fill
  const partiallySignedTx = await signTransactionMessageWithSigners(txMessage);

  const txBytes = getTransactionEncoder().encode(partiallySignedTx);

  const result = await wallet.signAndSendTransaction({
    transaction: txBytes as Uint8Array,
    chain: SOLANA_DEVNET_CHAIN,
  });

  // Convert raw signature bytes to hex for display
  const sigHex = Array.from(result.signature)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    mintAddress: mintSigner.address,
    signature: sigHex,
  };
}
