"use client";

import {
  address,
  createSolanaRpc,
  createTransactionMessage,
  generateKeyPairSigner,
  pipe,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  partiallySignTransactionMessageWithSigners,
  createNoopSigner,
  setTransactionMessageFeePayerSigner,
  getTransactionEncoder,
  flattenInstructionPlan,
  isSingleInstructionPlan,
} from "@solana/kit";
import {
  getCreateMintInstructionPlan,
  getMintToATAInstructionPlanAsync,
  getBurnInstruction,
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import type { ConnectedStandardSolanaWallet } from "@privy-io/js-sdk-core";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createMetadataAccountV3,
  findMetadataPda,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  publicKey as umiPublicKey,
  createNoopSigner as umiCreateNoopSigner,
  signerIdentity,
  transactionBuilder,
} from "@metaplex-foundation/umi";
import bs58 from "bs58";

export const TOKEN_DECIMALS = 9;
const DEVNET_RPC = "https://api.devnet.solana.com";
const SOLANA_DEVNET_CHAIN = "solana:devnet" as const;

export type SensorTokenMetadata = {
  name: string;
  symbol: string;
  uri?: string;
};

export type CreateSensorTokenResult = {
  mintAddress: string;
  signature: string;
};

export type MintTokensResult = {
  signature: string;
};

export type BurnTokensResult = {
  signature: string;
};

export async function burnTokens(
  wallet: ConnectedStandardSolanaWallet,
  mintAddress: string,
  amount: number
): Promise<BurnTokensResult> {
  const rpc = createSolanaRpc(DEVNET_RPC as `https://${string}`);

  const { value: latestBlockhash } = await rpc
    .getLatestBlockhash({ commitment: "confirmed" })
    .send();

  const walletAddr = address(wallet.address);
  const walletNoop = createNoopSigner(walletAddr);
  const mintAddr = address(mintAddress);

  const [ata] = await findAssociatedTokenPda({
    owner: walletAddr,
    mint: mintAddr,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const rawAmount = BigInt(Math.round(amount * 10 ** TOKEN_DECIMALS));

  const burnIx = getBurnInstruction({
    account: ata,
    mint: mintAddr,
    authority: walletNoop,
    amount: rawAmount,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txMessage: any = pipe(
    createTransactionMessage({ version: 0 }),
    (msg) => setTransactionMessageFeePayerSigner(walletNoop, msg),
    (msg) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, msg),
    (msg) => appendTransactionMessageInstruction(burnIx, msg)
  );

  const partiallySignedTx = await partiallySignTransactionMessageWithSigners(txMessage);
  const txBytes = getTransactionEncoder().encode(partiallySignedTx);

  const result = await wallet.signAndSendTransaction({
    transaction: txBytes as Uint8Array,
    chain: SOLANA_DEVNET_CHAIN,
  });

  return { signature: bs58.encode(result.signature) };
}

export async function mintTokens(
  wallet: ConnectedStandardSolanaWallet,
  mintAddress: string,
  recipientAddress: string,
  amount: number
): Promise<MintTokensResult> {
  const rpc = createSolanaRpc(DEVNET_RPC as `https://${string}`);

  const { value: latestBlockhash } = await rpc
    .getLatestBlockhash({ commitment: "confirmed" })
    .send();

  const walletAddr = address(wallet.address);
  const walletNoop = createNoopSigner(walletAddr);
  const mintAddr = address(mintAddress);
  const recipientAddr = address(recipientAddress);

  const rawAmount = BigInt(Math.round(amount * 10 ** TOKEN_DECIMALS));

  const plan = await getMintToATAInstructionPlanAsync({
    payer: walletNoop,
    owner: recipientAddr,
    mint: mintAddr,
    mintAuthority: walletNoop,
    amount: rawAmount,
    decimals: TOKEN_DECIMALS,
  });

  const flatPlans = flattenInstructionPlan(plan);
  const instructions = flatPlans
    .filter(isSingleInstructionPlan)
    .map((p) => p.instruction);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let txMessage: any = pipe(
    createTransactionMessage({ version: 0 }),
    (msg) => setTransactionMessageFeePayerSigner(walletNoop, msg),
    (msg) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, msg)
  );

  for (const ix of instructions) {
    txMessage = appendTransactionMessageInstruction(ix, txMessage);
  }

  const partiallySignedTx = await partiallySignTransactionMessageWithSigners(txMessage);
  const txBytes = getTransactionEncoder().encode(partiallySignedTx);

  const result = await wallet.signAndSendTransaction({
    transaction: txBytes as Uint8Array,
    chain: SOLANA_DEVNET_CHAIN,
  });

  return { signature: bs58.encode(result.signature) };
}

export async function createSensorToken(
  wallet: ConnectedStandardSolanaWallet,
  metadata: SensorTokenMetadata = { name: "Sensor Token", symbol: "SNSR" }
): Promise<CreateSensorTokenResult> {
  const rpc = createSolanaRpc(DEVNET_RPC as `https://${string}`);

  const { value: latestBlockhash } = await rpc
    .getLatestBlockhash({ commitment: "confirmed" })
    .send();

  const mintSigner = await generateKeyPairSigner();
  const walletAddress = address(wallet.address);
  const walletNoop = createNoopSigner(walletAddress);

  // --- SPL mint instructions ---
  const plan = getCreateMintInstructionPlan({
    payer: walletNoop,
    newMint: mintSigner,
    decimals: TOKEN_DECIMALS,
    mintAuthority: walletAddress,
    freezeAuthority: walletAddress,
  });

  const flatPlans = flattenInstructionPlan(plan);
  const mintInstructions = flatPlans
    .filter(isSingleInstructionPlan)
    .map((p) => p.instruction);

  // --- Metaplex metadata instruction via UMI ---
  const umi = createUmi(DEVNET_RPC);
  const walletUmiSigner = umiCreateNoopSigner(umiPublicKey(wallet.address));
  umi.use(signerIdentity(walletUmiSigner));

  const mintPublicKey = umiPublicKey(mintSigner.address);
  const [metadataPda] = findMetadataPda(umi, { mint: mintPublicKey });

  const metadataBuilder = createMetadataAccountV3(umi, {
    metadata: metadataPda,
    mint: mintPublicKey,
    mintAuthority: walletUmiSigner,
    payer: walletUmiSigner,
    updateAuthority: umiPublicKey(wallet.address),
    data: {
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri ?? "",
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,
    },
    isMutable: true,
    collectionDetails: null,
  });

  // Extract raw instruction from UMI builder
  const umiTx = transactionBuilder().add(metadataBuilder);
  const umiInstructions = umiTx.items.flatMap((item) => item.instruction ? [item.instruction] : []);

  // Convert UMI instructions to @solana/kit format
  // UMI data is an object-indexed byte map, convert to Uint8Array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadataInstructions = umiInstructions.map((ix: any) => ({
    programAddress: address(ix.programId.toString()),
    accounts: ix.keys.map((k: any) => ({
      address: address(k.pubkey.toString()),
      role: (k.isSigner ? 2 : 0) | (k.isWritable ? 1 : 0),
    })),
    data: Uint8Array.from(Object.values(ix.data) as number[]),
  }));

  // --- Build combined transaction ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let txMessage: any = pipe(
    createTransactionMessage({ version: 0 }),
    (msg) => setTransactionMessageFeePayerSigner(walletNoop, msg),
    (msg) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, msg)
  );

  for (const ix of [...mintInstructions, ...metadataInstructions]) {
    txMessage = appendTransactionMessageInstruction(ix, txMessage);
  }

  const partiallySignedTx = await partiallySignTransactionMessageWithSigners(txMessage);
  const txBytes = getTransactionEncoder().encode(partiallySignedTx);

  const result = await wallet.signAndSendTransaction({
    transaction: txBytes as Uint8Array,
    chain: SOLANA_DEVNET_CHAIN,
  });

  // Signature is raw bytes → base58 for Solana explorer
  const sigBase58 = bs58.encode(result.signature);

  return {
    mintAddress: mintSigner.address,
    signature: sigBase58,
  };
}
