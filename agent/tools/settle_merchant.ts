import { defineTool } from "eve/tools";
import { z } from "zod";
import { settleForMerchant } from "#lib/swap.js";

export default defineTool({
  description:
    "Settle a payment for a registered merchant. Given a merchantId and the USDC amount the facilitator settled to AnyPay, swap it to the merchant's local stablecoin and forward it to their payout wallet. Returns the tx hash as a receipt. This moves real money on Celo mainnet.",
  inputSchema: z.object({
    merchantId: z.string().regex(/^mch_[a-f0-9]{42}$/, "must be a valid merchantId"),
    amountUsdc: z.number().positive().max(2), // hard cap for the live demo wallet
  }),
  async execute({ merchantId, amountUsdc }) {
    return settleForMerchant(merchantId, amountUsdc);
  },
});
