export const jobApplicationPrompt = {
	name: "capacities-job-application",
	description:
		"Generate a Capacities-ready markdown file for tracking job applications. Creates properly formatted YAML frontmatter and structure for import into Capacities.",
	arguments: [
		{
			name: "companyName",
			description: "Name of the company",
			required: true,
		},
		{
			name: "role",
			description: "Job title/role being applied for",
			required: true,
		},
		{
			name: "jobBoard",
			description: "Source where you found the job (LinkedIn, Indeed, etc.)",
			required: false,
		},
		{
			name: "postingLink",
			description: "URL to the job posting",
			required: false,
		},
		{
			name: "jobDescription",
			description: "Full job description text",
			required: false,
		},
		{
			name: "requiredSkills",
			description: "Required skills and experience from the posting",
			required: false,
		},
		{
			name: "summary",
			description: "Your summary/notes about the position",
			required: false,
		},
		{
			name: "importantNotes",
			description: "Any important notes to remember",
			required: false,
		},
		{
			name: "tags",
			description: "Comma-separated tags (e.g., 'remote, senior, typescript')",
			required: false,
		},
		{
			name: "status",
			description: "Application status (e.g., 'Applied', 'Interview', 'Offer')",
			required: false,
		},
	],
	// biome-ignore lint/suspicious/noExplicitAny: FastMCP prompt args type
	load: async (args: any) => {
		const today = new Date().toISOString().split("T")[0];
		const modificationDateTime = new Date()
			.toISOString()
			.replace("T", " ")
			.slice(0, 16);

		const tagsArray: string[] = args.tags
			? args.tags.split(",").map((t: string) => t.trim())
			: [];

		const tagsFormatted =
			tagsArray.length > 0
				? `[${tagsArray.map((t: string) => `"${t}"`).join(", ")}]`
				: "[]";

		const fileName = `${args.companyName.replace(/\s+/g, "-")}-${args.role.replace(/\s+/g, "-")}.md`;

		const markdown = `---
type: Application
title: ${args.role} at ${args.companyName}
modificationDate: ${modificationDateTime}
tags: ${tagsFormatted}
status: ${args.status || "null"}
companyName: ${args.companyName}
role: ${args.role}
jobBord: ${args.jobBoard || "null"}
importantNotes: ${args.importantNotes || "null"}
postingLink: ${args.postingLink || "null"}
summary: ${args.summary || "null"}
relatedContracts: []
dateApplied: '${today}'
---

## Notes


### **Summary**

${args.summary || ""}


### Job Description

${args.jobDescription || ""}


### Required Skills and Experience

${args.requiredSkills || ""}
`;

		return `Save this Capacities-ready markdown to a file named "${fileName}":\n\n\`\`\`markdown\n${markdown}\`\`\``;
	},
};
