// Merchant registry for the AnyPay "merchant side".
//
// A merchant registers a payout wallet + target currency and gets back a merchantId and a
// collection address. They put that collection address as the `payTo` in their x402 (HTTP 402)
// responses; Celo's facilitator settles buyer USDC there. AnyPay then swaps the USDC to the
// merchant's currency and forwards it (see settleForMerchant in ./swap).
//
// The merchantId is SELF-DESCRIBING: it encodes the payout wallet + currency directly, so
// settlement needs no database — the id round-trips to {payTo, currency}. This keeps v1
// stateless (works across serverless invocations and deploys) with no KV to provision.

import type { LocalCurrency } from "./celo.js";

const CODES: Record<LocalCurrency, string> = { KESm: "01", COPm: "02", PHPm: "03" };
const BY_CODE: Record<string, LocalCurrency> = { "01": "KESm", "02": "COPm", "03": "PHPm" };

export type Merchant = { merchantId: string; payTo: `0x${string}`; currency: LocalCurrency };

// v1 shared collection address = the AnyPay agent wallet. Merchants point their 402 `payTo`
// here; the merchantId (carried in the settle call) says which merchant + currency it is.
export function collectionAddress(): `0x${string}` {
  return "0xfAcfE00760561fAB2DB764C6a4b2016B38d0e732";
}

// mch_ + <40 hex payTo> + <2 hex currency code>
export function merchantIdFor(payTo: string, currency: LocalCurrency): string {
  return "mch_" + payTo.slice(2).toLowerCase() + CODES[currency];
}

export function registerMerchant(payTo: `0x${string}`, currency: LocalCurrency): Merchant {
  return { merchantId: merchantIdFor(payTo, currency), payTo, currency };
}

export function getMerchant(merchantId: string): Merchant | undefined {
  const body = merchantId.startsWith("mch_") ? merchantId.slice(4) : "";
  if (body.length !== 42) return undefined;
  const payTo = ("0x" + body.slice(0, 40)) as `0x${string}`;
  const currency = BY_CODE[body.slice(40, 42)];
  if (!currency) return undefined;
  return { merchantId, payTo, currency };
}
