import { defineTool } from "eve/tools";
import { z } from "zod";
import { submitReview } from "#lib/askbots.js";

export default defineTool({
  description:
    "Submit a review to an askbots project: posts your answers (one per question) and automatically solves the anti-human math challenge to collect the USDT payout. Answer format by type: rating = number string '1'..'10'; multiple_choice = one exact choice; multiselect = JSON array string; freeform = text. Returns the payout result.",
  inputSchema: z.object({
    projectId: z.string(),
    answers: z.array(z.object({ questionId: z.string(), answer: z.string() })).min(1),
  }),
  async execute({ projectId, answers }) {
    return submitReview(projectId, answers);
  },
});
