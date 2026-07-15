// Deterministic money path. No LLM ever calls anything here directly — tools invoke these
// functions with validated inputs. swapAndForward does USDC -> local stablecoin AND delivery
// to the recipient in a single on-chain tx (the router's `to` param), tagged for Track 1.

import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  parseUnits,
  formatUnits,
} from "viem";
import { celo } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { toDataSuffix } from "@celo/attribution-tags";
import {
  RPC_URL,
  ROUTER,
  ROUTER_ABI,
  ERC20_ABI,
  USDC,
  USDC_DECIMALS,
  LOCAL_DECIMALS,
  LOCAL_TOKENS,
  ATTRIBUTION_TAG,
  routeFor,
  type LocalCurrency,
} from "./celo.js";

const SLIPPAGE_BPS = 100n; // 1.00% floor (Mento pools are ~0 slippage, this is a safety net)
const DEADLINE_SECONDS = 300n;

export const publicClient = createPublicClient({ chain: celo, transport: http(RPC_URL) });

function account() {
  const pk = process.env.ANYPAY_AGENT_PRIVATE_KEY;
  if (!pk) throw new Error("ANYPAY_AGENT_PRIVATE_KEY is not set");
  return privateKeyToAccount(pk.startsWith("0x") ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`));
}

/** Read-only: how much local stablecoin `amountUsdc` buys right now. */
export async function quote(currency: LocalCurrency, amountUsdc: number) {
  const amountIn = parseUnits(amountUsdc.toString(), USDC_DECIMALS);
  const amounts = (await publicClient.readContract({
    address: ROUTER,
    abi: ROUTER_ABI,
    functionName: "getAmountsOut",
    args: [amountIn, routeFor(currency)],
  })) as bigint[];
  const outWei = amounts[amounts.length - 1];
  const amountOut = Number(formatUnits(outWei, LOCAL_DECIMALS));
  return { amountUsdc, currency, amountOut, rate: amountOut / amountUsdc, outWei, amountIn };
}

/**
 * Swap USDC -> `currency` and deliver to `recipient` in one tagged tx.
 * Returns the swap tx hash and the delivered amount.
 */
export async function swapAndForward(
  currency: LocalCurrency,
  amountUsdc: number,
  recipient: `0x${string}`,
) {
  const acct = account();
  const wallet = createWalletClient({ account: acct, chain: celo, transport: http(RPC_URL) });

  const { amountIn, outWei } = await quote(currency, amountUsdc);
  const minOut = (outWei * (10_000n - SLIPPAGE_BPS)) / 10_000n;

  // Ensure the router can pull our USDC.
  const allowance = (await publicClient.readContract({
    address: USDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [acct.address, ROUTER],
  })) as bigint;
  if (allowance < amountIn) {
    const approveHash = await wallet.sendTransaction({
      to: USDC,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [ROUTER, 2n ** 256n - 1n],
      }),
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000)) + DEADLINE_SECONDS;
  const calldata = encodeFunctionData({
    abi: ROUTER_ABI,
    functionName: "swapExactTokensForTokens",
    args: [amountIn, minOut, routeFor(currency), recipient, deadline],
  });
  // Append the ERC-8021 attribution tag so Track 1 credits this volume to AnyPay.
  const suffix = toDataSuffix(ATTRIBUTION_TAG).slice(2);
  const data = (calldata + suffix) as `0x${string}`;

  const hash = await wallet.sendTransaction({ to: ROUTER, data });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  const delivered = Number(formatUnits(minOut, LOCAL_DECIMALS));
  return {
    txHash: hash,
    status: receipt.status,
    currency,
    recipient,
    amountUsdc,
    minDelivered: delivered,
    explorer: `https://celoscan.io/tx/${hash}`,
    tokenAddress: LOCAL_TOKENS[currency],
  };
}
