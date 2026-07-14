# AnyPay — multi-currency settlement for x402 on Celo

**Agents pay in USDC. Merchants get paid in their local stablecoin. One HTTP request in between.**

Built for the [Celo Agentic Payments & DeFAI Hackathon](https://celobuilders.xyz/) (Jul 7 – Aug 3, 2026).

## Problem

Celo's x402 facilitator makes it trivial for any API or agent to accept stablecoin payments — but it settles in **USDC only**. Meanwhile, Celo's whole differentiator is Mento's family of local stablecoins — KESm, COPm, PHPm and more — designed so value can live in the currency people actually price their lives in. Today those two worlds don't connect: a merchant selling API calls through the facilitator earns USDC, and turning that into KESm means doing their own DeFi — gas, approvals, DEX integration. On the paying side, a minimal agent (a private key and `fetch()`) can sign an x402 payment but can't operate a swap. Dollars circulate between agents; Mento's local stablecoins stay out of the loop.

## Solution

AnyPay is an **independent companion agent for the Celo x402 facilitator** — no changes to the facilitator, no contracts to deploy, just a layer that plugs in from the outside. Built as a Vercel eve agent.

**Merchant side (core).** A merchant registers in one call:

```
POST /register  { "payTo": "0xabc...", "currency": "KESm" }
```

They get back an AnyPay collection address to use as the `payTo` in their 402 responses. The facilitator settles buyer USDC to that address exactly as it does today; AnyPay's agent then swaps it via Mento and forwards the KESm to the merchant's wallet, returning the tx hash as receipt. The merchant prices in dollars and settles in their local stablecoin — without touching a DEX.

**Agent side (bonus).** The same core function exposed in reverse, x402-gated:

```
POST /pay  { "amount": "5", "currency": "KESm", "to": "0x..." }
```

Any agent can send local-stablecoin payouts in one request.

## Launch currencies

**KESm**, **COPm**, **PHPm** — liquidity verified on-chain: all three route USDC → USDm → local via the Mento broker at oracle price, zero slippage (virtual mint/burn pools), ~0.05% total fee. Adding GHSm, NGNm, or XOFm is one config entry.

## Tech stack

- **eve (Vercel)** — agent runtime: instructions in Markdown, one core TypeScript tool (`swapAndForward.ts`), durable schedules for sweeping settlements
- **Celo x402 facilitator** — untouched; AnyPay is a registered `payTo` recipient, nothing more
- **Mento SDK + viem** — on-chain FX (`buildSwapParams` handles the two-hop route)
- **ERC-8021 Attribution Tags** — every swap publicly attributable to AnyPay

## Honest limitation (and the roadmap)

v1 holds funds for the seconds between settlement and forward (hosted wallet, small amounts, open source). v2 replaces it with a router contract — receive → swap → forward, atomic — restoring the facilitator's non-custodial property end to end.

## Why it matters

x402 turned payments into an HTTP status code, but only in dollars. AnyPay is the missing FX leg: it connects the facilitator to Mento's local stablecoins, so anyone selling to agents can price in USDC and settle in the asset that matches their real economy. It also gives Mento's regional stables a new, recurring source of on-chain demand — every x402 sale becomes a local-stablecoin settlement.

## Hackathon fit

Every payment through AnyPay = one x402 settlement (**Track 2**) + one attributed Mento swap (**Track 1**). Built as an independent open-source project that adds a capability to Celo Core Co.'s facilitator without forking it.
