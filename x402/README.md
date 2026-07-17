# AnyPay × x402 (Track 2)

Real pay-per-request settlements through **Celo's x402 facilitator** (`https://api.x402.celo.org`),
settling USDC to the AnyPay agent wallet.

## How it works

The x402 "exact" scheme settles via **EIP-3009 `transferWithAuthorization`**: the payer signs a
stablecoin transfer authorization off-chain, and the facilitator submits it on-chain and pays the
gas itself (non-custodial — funds move payer → seller inside the token contract).

`settle.mjs` implements the flow directly against the facilitator:

1. Sign an EIP-3009 authorization for USDC (domain `{ name: "USDC", version: "2", chainId: 42220 }`).
2. `POST /verify` — facilitator validates the signature/payload (keyless).
3. `POST /settle` — facilitator broadcasts the transfer (requires `X-API-Key`).

Each successful settle is one x402 payment to the agent wallet — what Track 2 counts.

## Why direct (not the middleware)

The published `x402` / `x402-express` / `x402-fetch` packages (v1.2.0) don't yet allowlist Celo in
`SupportedEVMNetworks`, so they reject `network: "eip155:42220"`. The facilitator **does** support
Celo (`/supported` returns both `celo` and `eip155:42220`), so we talk to it directly and sign the
EIP-3009 authorization with viem. No key custody, standard protocol.

## Run

```bash
export PAYER_PK=0x...            # a wallet holding USDC (payer)
export X402_API_KEY=x402_live... # from x402.celo.org (settle metering)
node settle.mjs 5                # settle 5 payments to the agent wallet
```

## Verified

First settlement: [`0x0ad95fbc…0abb`](https://celoscan.io/tx/0x0ad95fbcfefb35051cfd969c31fce9beceff9234ac33ba5f2ed5b453e87b0abb)
— broadcast by the facilitator relayer `0x0d74…FB48`, USDC payer → agent wallet.
Leaderboard: https://dune.com/celo/agentic-payments-defai-hackathon
