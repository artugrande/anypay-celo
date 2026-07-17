// Direct x402 settlement through the Celo facilitator (no middleware — the npm packages
// don't allowlist Celo yet, but the facilitator does). Signs an EIP-3009 transferWithAuthorization
// off-chain and asks the facilitator to broadcast it (facilitator pays gas).
import { privateKeyToAccount } from "viem/accounts";
import { randomBytes } from "node:crypto";

const FACILITATOR = "https://api.x402.celo.org";
const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
const AGENT = "0xfAcfE00760561fAB2DB764C6a4b2016B38d0e732"; // seller / payTo
const AMOUNT = "1000"; // 0.001 USDC

const account = privateKeyToAccount(process.env.PAYER_PK);

function nonce() { return "0x" + randomBytes(32).toString("hex"); }

async function settleOnce(i) {
  const now = Math.floor(Date.now() / 1000);
  const authorization = {
    from: account.address,
    to: AGENT,
    value: AMOUNT,
    validAfter: "0",
    validBefore: String(now + 3600),
    nonce: nonce(),
  };

  const signature = await account.signTypedData({
    domain: { name: "USDC", version: "2", chainId: 42220, verifyingContract: USDC },
    types: {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    message: {
      from: authorization.from,
      to: authorization.to,
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce,
    },
  });

  const paymentRequirements = {
    scheme: "exact",
    network: "celo",
    maxAmountRequired: AMOUNT,
    resource: "https://anypay-celo.vercel.app/x402",
    description: "AnyPay x402 pay-per-request",
    mimeType: "application/json",
    payTo: AGENT,
    maxTimeoutSeconds: 120,
    asset: USDC,
    extra: { name: "USDC", version: "2" },
  };

  const paymentPayload = {
    x402Version: 1,
    scheme: "exact",
    network: "celo",
    payload: { signature, authorization },
  };

  const body = JSON.stringify({ x402Version: 1, paymentPayload, paymentRequirements });

  const vr = await fetch(`${FACILITATOR}/verify`, { method: "POST", headers: { "content-type": "application/json" }, body });
  const verify = await vr.json();
  if (!verify.isValid) { console.log(`#${i} verify FAILED:`, JSON.stringify(verify)); return; }

  const sr = await fetch(`${FACILITATOR}/settle`, { method: "POST", headers: { "content-type": "application/json", "X-API-Key": process.env.X402_API_KEY }, body });
  const settle = await sr.json();
  console.log(`#${i} settle:`, JSON.stringify(settle));
}

const N = Number(process.argv[2] || 1);
for (let i = 1; i <= N; i++) await settleOnce(i);
