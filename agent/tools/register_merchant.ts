import { defineTool } from "eve/tools";
import { z } from "zod";
import { registerMerchant, collectionAddress } from "#lib/merchants.js";

export default defineTool({
  description:
    "Register a merchant so they can accept x402 payments and get paid in their local Mento stablecoin. Takes the merchant's payout wallet and target currency (KESm, COPm, or PHPm) and returns a merchantId plus the AnyPay collection address to use as the `payTo` in their HTTP 402 responses.",
  inputSchema: z.object({
    payTo: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "must be a 0x-prefixed address"),
    currency: z.enum(["KESm", "COPm", "PHPm"]),
  }),
  async execute({ payTo, currency }) {
    const m = registerMerchant(payTo as `0x${string}`, currency);
    return {
      merchantId: m.merchantId,
      payoutWallet: m.payTo,
      currency: m.currency,
      collectionAddress: collectionAddress(),
      instructions:
        "Use `collectionAddress` as the payTo in your x402 (HTTP 402) responses. When the Celo facilitator settles USDC there, AnyPay swaps it to your currency and forwards it to your payout wallet.",
    };
  },
});
