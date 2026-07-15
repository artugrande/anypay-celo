// Standalone test of the deterministic money path (no eve, no LLM).
// Usage:
//   node scripts/test-swap.ts quote                      -> read-only quote
//   node scripts/test-swap.ts pay <currency> <usdc> <to> -> REAL swap+forward
import { quote, swapAndForward } from "../agent/lib/swap.js";
import type { LocalCurrency } from "../agent/lib/celo.js";

const [, , mode, cur, amt, to] = process.argv;

if (mode === "quote") {
  for (const c of ["KESm", "COPm", "PHPm"] as LocalCurrency[]) {
    const q = await quote(c, Number(amt) || 1);
    console.log(`${q.amountUsdc} USDC -> ${q.amountOut.toFixed(2)} ${c}  (rate ${q.rate.toFixed(4)})`);
  }
} else if (mode === "pay") {
  const res = await swapAndForward(cur as LocalCurrency, Number(amt), to as `0x${string}`);
  console.log(JSON.stringify(res, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
} else {
  console.log("usage: quote | pay <currency> <usdc> <to>");
}
