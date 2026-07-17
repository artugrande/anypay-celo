import { defineTool } from "eve/tools";
import { z } from "zod";
import { getProject, gatherEvidence } from "#lib/askbots.js";

export default defineTool({
  description:
    "Gather real evidence for an askbots project before reviewing it: fetches/probes the property (skill file content, API response, or live MCP initialize+tools/list handshake) and returns the full question set. If `ok` is false, evidence could not be gathered — SKIP the project rather than submit a weak review.",
  inputSchema: z.object({ projectId: z.string() }),
  async execute({ projectId }) {
    const project = await getProject(projectId);
    const { ok, evidence } = await gatherEvidence(project.propertyType, project.propertyUrl);
    return {
      ok,
      name: project.name,
      propertyType: project.propertyType,
      propertyUrl: project.propertyUrl,
      questions: project.questions,
      evidence,
    };
  },
});
