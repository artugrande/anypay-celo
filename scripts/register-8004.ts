// One-off: register AnyPay's ERC-8004 identity on Celo mainnet.
import { createPublicClient, createWalletClient, http } from "viem";
import { celo } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
const AGENT_URI = "https://anypay-celo-site.vercel.app/agent.json";
const RPC = "https://forno.celo.org";

const ABI = [
  { type: "function", name: "register", stateMutability: "nonpayable", inputs: [{ name: "agentURI", type: "string" }], outputs: [{ type: "uint256" }] },
  { type: "event", name: "Transfer", inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "tokenId", type: "uint256", indexed: true },
  ] },
] as const;

const pk = process.env.ANYPAY_AGENT_PRIVATE_KEY!;
const account = privateKeyToAccount(pk.startsWith("0x") ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`));
const pub = createPublicClient({ chain: celo, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: celo, transport: http(RPC) });

const { result: agentId, request } = await pub.simulateContract({
  address: IDENTITY_REGISTRY, abi: ABI, functionName: "register", args: [AGENT_URI], account,
});
console.log("simulated agentId:", agentId.toString());

const hash = await wallet.writeContract(request);
console.log("tx:", hash);
const receipt = await pub.waitForTransactionReceipt({ hash });
console.log("status:", receipt.status);
console.log(JSON.stringify({
  agentId: agentId.toString(),
  tx: hash,
  celoscanTx: `https://celoscan.io/tx/${hash}`,
  scan8004: `https://8004scan.io/agents/celo/${agentId}`,
  nftCeloscan: `https://celoscan.io/nft/0x8004a169fb4a3325136eb29fa0ceb6d2e539a432/${agentId}`,
}, null, 2));
