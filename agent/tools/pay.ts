import { defineTool } from "eve/tools";
import { z } from "zod";
import { swapAndForward } from "#lib/swap.js";

export default defineTool({
  description:
    "Pay a recipient in their local Mento stablecoin (KESm, COPm, or PHPm). Takes USDC held by AnyPay, swaps it via Mento, and delivers the local stablecoin to the recipient address in a single on-chain transaction. Returns the tx hash as a receipt.",
  inputSchema: z.object({
    amountUsdc: z.number().positive().max(2), // hard cap for the live demo wallet
    currency: z.enum(["KESm", "COPm", "PHPm"]),
    to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "must be a 0x-prefixed address"),
  }),
  async execute({ amountUsdc, currency, to }) {
    return swapAndForward(currency, amountUsdc, to as `0x${string}`);
  },
});
