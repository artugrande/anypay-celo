// askbots.ai reviewer flow (Track 3), used by the review tools + the daily schedule.
// The agent's LLM writes the actual review text; these helpers do the mechanical parts:
// list matched projects, gather real evidence from a property, and submit + solve the
// anti-human math challenge. Quality guardrails live in the tools + the schedule prompt.

const BASE = "https://main--askbots.netlify.app/api";

// Only these types have programmatic, reliable evidence. Websites/miniapps usually need
// real interaction (wallet-connect, gameplay) we can't do well, so the cron skips them —
// a weak review earns a thumbs-down and lowers our rating.
export const SAFE_TYPES = ["api", "mcp_server", "skill_file"] as const;

// Never review our own team's projects (conflict of interest / sybil signal).
const OWN_URL_FRAGMENTS = ["zorrito.app", "anypay-celo"];

function key(): string {
  const k = process.env.ASKBOTS_API_KEY;
  if (!k) throw new Error("ASKBOTS_API_KEY is not set");
  return k;
}

async function api(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.auth !== false) headers.authorization = `Bearer ${key()}`;
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${res.status} ${path}: ${JSON.stringify(json)}`);
  return json;
}

// Precedence-correct integer evaluator for the rapid_math anti-human challenge (BigInt).
export function solveMath(prompt: string): string {
  const expr = prompt.replace(/[^0-9+\-*() ]/g, "").trim();
  let i = 0;
  const skip = () => { while (expr[i] === " ") i++; };
  function num(): bigint {
    skip();
    if (expr[i] === "(") { i++; const v = add(); skip(); if (expr[i] === ")") i++; return v; }
    let s = ""; while (/[0-9]/.test(expr[i])) s += expr[i++];
    return BigInt(s);
  }
  function mul(): bigint { let v = num(); skip(); while (expr[i] === "*") { i++; v *= num(); skip(); } return v; }
  function add(): bigint { let v = mul(); skip(); while (expr[i] === "+" || expr[i] === "-") { const op = expr[i++]; const r = mul(); v = op === "+" ? v + r : v - r; skip(); } return v; }
  return add().toString();
}

function isOwn(url: string): boolean {
  const u = (url || "").toLowerCase();
  return OWN_URL_FRAGMENTS.some((f) => u.includes(f));
}

/** Matched projects, filtered to safe technical types and excluding our own. */
export async function scanProjects() {
  const { projects = [] } = await api("/projects");
  return projects
    .filter((p: any) => SAFE_TYPES.includes(p.propertyType) && !isOwn(p.propertyUrl))
    .map((p: any) => ({
      id: p._id,
      name: p.name,
      propertyType: p.propertyType,
      propertyUrl: p.propertyUrl,
      responsesReceived: p.responsesReceived,
      questions: p.questions,
    }));
}

export async function getProject(id: string) {
  return api(`/projects/${id}`);
}

/** Fetch/probe a property and return evidence text for the LLM to base its review on.
 *  Returns { ok, evidence } — if ok is false, the caller should SKIP (no weak reviews). */
export async function gatherEvidence(propertyType: string, url: string): Promise<{ ok: boolean; evidence: string }> {
  const full = url.startsWith("http") ? url : `https://${url}`;
  try {
    if (propertyType === "skill_file") {
      const r = await fetch(full, { redirect: "follow" });
      const body = await r.text();
      if (!r.ok || body.length < 40) return { ok: false, evidence: `fetch ${r.status}, ${body.length} bytes` };
      return { ok: true, evidence: `HTTP ${r.status}. Skill file (${body.length} bytes):\n\n${body.slice(0, 6000)}` };
    }
    if (propertyType === "api") {
      const r = await fetch(full, { headers: { accept: "application/json, text/html" } });
      const body = (await r.text()).slice(0, 4000);
      return { ok: r.ok, evidence: `GET ${full} -> HTTP ${r.status} ${r.headers.get("content-type") || ""}\n\n${body}` };
    }
    if (propertyType === "mcp_server") {
      const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };
      const init = await fetch(full, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "anypay-reviewer", version: "1.0.0" } } }) });
      const initJson = await init.json().catch(() => null);
      if (!init.ok || !initJson?.result) return { ok: false, evidence: `initialize HTTP ${init.status}` };
      const toolsRes = await fetch(full, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }) });
      const toolsJson = await toolsRes.json().catch(() => null);
      const tools = (toolsJson?.result?.tools || []).map((t: any) => `${t.name}: ${(t.description || "").slice(0, 120)}`);
      return { ok: true, evidence: `initialize -> HTTP ${init.status}, serverInfo ${JSON.stringify(initJson.result.serverInfo)}, capabilities ${JSON.stringify(initJson.result.capabilities)}.\ntools/list (${tools.length}):\n- ${tools.join("\n- ")}` };
    }
    return { ok: false, evidence: `unsupported type ${propertyType}` };
  } catch (e: any) {
    return { ok: false, evidence: `probe failed: ${String(e?.message || e).slice(0, 200)}` };
  }
}

/** Submit answers, then solve + verify the anti-human challenge in one shot. */
export async function submitReview(projectId: string, answers: Array<{ questionId: string; answer: string }>) {
  const resp = await api(`/projects/${projectId}/respond`, { method: "POST", body: { answers } });
  if (!resp.challengeId) return { submitted: true, challenge: null, result: resp };
  const answer = solveMath(resp.prompt);
  const verify = await api(`/projects/${projectId}/verify-challenge`, { method: "POST", body: { challengeId: resp.challengeId, answer } });
  return { submitted: true, prompt: resp.prompt, result: verify };
}
