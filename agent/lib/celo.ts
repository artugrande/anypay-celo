// AnyPay on-chain config — Celo mainnet. All addresses verified on-chain 2026-07-14.
// The Mento SDK is unusable inside eve (broken ESM build / bundler drops it), so we call
// the Mento router directly with viem. Routes are fixed constants; quoting is one view call.

export const RPC_URL = "https://forno.celo.org";

// Mento v3 router + factories
export const ROUTER = "0x4861840C2EfB2b98312B0aE34d86fD73E8f9B6f6" as const;
const FPMM_FACTORY = "0xa849b475FE5a4B5C9C3280152c7a1945b907613b" as const; // USDC <-> USDm
const VIRTUAL_FACTORY = "0x22abd4ADF6aab38aC1022352d496A07Acee5aCB3" as const; // USDm <-> local

// Tokens
export const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as const;
export const USDC_DECIMALS = 6;
const USDM = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;

export type LocalCurrency = "KESm" | "COPm" | "PHPm";

export const LOCAL_TOKENS: Record<LocalCurrency, `0x${string}`> = {
  KESm: "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0",
  COPm: "0x8A567e2aE79CA692Bd748aB832081C45de4041eA",
  PHPm: "0x105d4A9306D2E55a71d2Eb95B81553AE1dC20d7B",
};
export const LOCAL_DECIMALS = 18;

export type Hop = { from: `0x${string}`; to: `0x${string}`; factory: `0x${string}` };

// USDC -> USDm (FPMM) -> local (Virtual)
export function routeFor(currency: LocalCurrency): Hop[] {
  return [
    { from: USDC, to: USDM, factory: FPMM_FACTORY },
    { from: USDM, to: LOCAL_TOKENS[currency], factory: VIRTUAL_FACTORY },
  ];
}

export const ROUTER_ABI = [
  {
    type: "function",
    name: "getAmountsOut",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      {
        name: "path",
        type: "tuple[]",
        components: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "factory", type: "address" },
        ],
      },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "swapExactTokensForTokens",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      {
        name: "routes",
        type: "tuple[]",
        components: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "factory", type: "address" },
        ],
      },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

// Hackathon attribution tag (ERC-8021), locked to repo artugrande/anypay-celo.
// Appended to swap calldata so Track 1 credits the volume to AnyPay.
export const ATTRIBUTION_TAG = "celo_a1d871ce7f3a";
