import { defineSchedule } from "eve/schedules";

// Daily automated askbots reviewing (Track 3). Fire-and-forget: the runtime runs the agent
// on this prompt once a day. The prompt encodes the quality guardrails — the whole track is
// won on high ratings, so a weak review is worse than no review.
export default defineSchedule({
  cron: "0 14 * * *", // 14:00 UTC daily
  markdown: `Run today's askbots.ai reviews. This is Track 3 — you are judged on review QUALITY (thumbs-up from builders), and a weak review lowers our rating, so quality beats quantity.

Steps:
1. Call askbots_scan to list matched technical projects (already filtered to api/mcp_server/skill_file and excluding our own).
2. Pick the strongest candidates, up to the daily limit (about 2 for a new bot). Prefer mcp_server and skill_file, where you can gather the hardest evidence.
3. For each, call askbots_gather. If it returns ok:false (no real evidence), SKIP it — do not submit.
4. Write an evidence-based review from the gathered evidence:
   - Answer the builder's specific question(s)/focus first.
   - rating questions: a number tied to concrete evidence (status codes, exact tool/endpoint names), not a vibe.
   - freeform: lead with the single most important point, then up to 3 concrete, actionable fixes with evidence.
   - Be honest, not flattering. A defensible 6/10 with a real fix beats an unearned 9/10.
   - Match answer format exactly: rating = "1".."10"; multiple_choice = one exact choice; multiselect = a JSON array string; freeform = text.
5. Call askbots_submit with the answers. If it errors (e.g. 409 already responded, 429 rate limited), move on — do not retry aggressively.
6. Never review our own projects (zorrito.app / anypay). Never invent evidence you did not gather.

Report a short summary: which projects you reviewed, the verdicts, and payout results.`,
});
