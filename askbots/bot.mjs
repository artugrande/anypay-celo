// AnyPay reviewer bot for askbots.ai (Track 3).
// CLI: register | profile | list | show <id> | submit <id> <answers.json>
//
// Payouts: $0.10 USDT per accepted response to the Celo address in the profile.
// Auth: API key from ~/.askbots-credentials.json (created by `register`) or ASKBOTS_API_KEY.
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const BASE = "https://main--askbots.netlify.app/api";
const CRED = join(homedir(), ".askbots-credentials.json");
const CELO_ADDRESS = "0xfAcfE00760561fAB2DB764C6a4b2016B38d0e732"; // agent wallet (receive-only)

function loadKey() {
  if (process.env.ASKBOTS_API_KEY) return process.env.ASKBOTS_API_KEY;
  try { return JSON.parse(readFileSync(CRED, "utf8")).apiKey; } catch { return null; }
}

async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "content-type": "application/json" };
  if (auth) {
    const key = loadKey();
    if (!key) throw new Error("no API key — run `register` first");
    headers.authorization = `Bearer ${key}`;
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${res.status} ${path}: ${JSON.stringify(json)}`);
  return json;
}

// Evaluate the anti-human rapid-math prompt (e.g. "What is 847293 * 193847 + 582910384?")
// Precedence-correct integer parser over + - * with BigInt.
function solveMath(prompt) {
  const expr = prompt.replace(/[^0-9+\-*() ]/g, "").trim();
  let i = 0;
  const peek = () => expr[i];
  const skip = () => { while (expr[i] === " ") i++; };
  function num() {
    skip();
    if (expr[i] === "(") { i++; const v = add(); skip(); if (expr[i] === ")") i++; return v; }
    let s = ""; while (/[0-9]/.test(expr[i])) s += expr[i++];
    return BigInt(s);
  }
  function mul() { let v = num(); skip(); while (peek() === "*") { i++; v *= num(); skip(); } return v; }
  function add() { let v = mul(); skip(); while (peek() === "+" || peek() === "-") { const op = expr[i++]; const r = mul(); v = op === "+" ? v + r : v - r; skip(); } return v; }
  return add().toString();
}

const [cmd, arg1, arg2] = process.argv.slice(2);

if (cmd === "register") {
  const name = arg1 || "AnyPayReviewer";
  const description = arg2 || "Deep technical reviewer for APIs, MCP servers, skill files, and on-chain/DeFi products. Verifies claims, checks that endpoints actually work, and gives specific, actionable feedback.";
  const r = await api("/auth/openclaw", { method: "POST", auth: false, body: { name, description } });
  writeFileSync(CRED, JSON.stringify(r, null, 2), { mode: 0o600 });
  console.log("registered:", JSON.stringify({ agentId: r.agentId, name }), "\napiKey saved to", CRED);
} else if (cmd === "profile") {
  const r = await api("/bot-profiles", { method: "POST", body: {
    botName: "AnyPayReviewer",
    country: "AR",
    skills: ["browser", "github", "anthropic", "webhooks"],
    celoAddress: CELO_ADDRESS,
  }});
  console.log("profile:", JSON.stringify(r));
} else if (cmd === "me") {
  console.log(JSON.stringify(await api("/bot-profiles/me"), null, 2));
} else if (cmd === "list") {
  const r = await api("/projects");
  console.log(JSON.stringify(r, null, 2));
} else if (cmd === "show") {
  console.log(JSON.stringify(await api(`/projects/${arg1}`), null, 2));
} else if (cmd === "submit") {
  const answers = JSON.parse(readFileSync(arg2, "utf8")); // [{questionId, answer}]
  const resp = await api(`/projects/${arg1}/respond`, { method: "POST", body: { answers } });
  console.log("challenge:", resp.challengeType, "-", resp.prompt);
  const answer = solveMath(resp.prompt);
  const v = await api(`/projects/${arg1}/verify-challenge`, { method: "POST", body: { challengeId: resp.challengeId, answer } });
  console.log("verify:", JSON.stringify(v));
} else {
  console.log("usage: register [name] [desc] | profile | me | list | show <id> | submit <id> <answers.json>");
}
