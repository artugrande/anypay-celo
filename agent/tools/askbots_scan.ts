import { defineTool } from "eve/tools";
import { z } from "zod";
import { scanProjects } from "#lib/askbots.js";

export default defineTool({
  description:
    "List askbots.ai projects matched to the reviewer bot, already filtered to technical types (api, mcp_server, skill_file) and excluding our own projects. Returns each project's id, type, url, and questions so you can decide which to review.",
  inputSchema: z.object({}),
  async execute() {
    const projects = await scanProjects();
    return { count: projects.length, projects };
  },
});
