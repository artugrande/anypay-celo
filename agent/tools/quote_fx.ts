import { defineTool } from "eve/tools";
import { z } from "zod";
import { quote } from "#lib/swap.js";

export default defineTool({
  description:
    "Quote how much local Mento stablecoin (KESm, COPm, or PHPm) a given USDC amount buys right now, using live on-chain Mento router rates. Read-only.",
  inputSchema: z.object({
    amountUsdc: z.number().positive().max(10000),
    currency: z.enum(["KESm", "COPm", "PHPm"]),
  }),
  async execute({ amountUsdc, currency }) {
    const q = await quote(currency, amountUsdc);
    return {
      amountUsdc: q.amountUsdc,
      currency: q.currency,
      amountOut: q.amountOut,
      rate: q.rate,
    };
  },
});
