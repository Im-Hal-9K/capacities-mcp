#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	GetPromptRequestSchema,
	ListPromptsRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { API_BASE_URL, getApiKey, makeApiRequest } from "./api.js";

// Tool definitions
const TOOLS = [
	{
		name: "capacities_list_spaces",
		description: "Get a list of all personal spaces in Capacities",
		inputSchema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
	},
	{
		name: "capacities_get_space_info",
		description:
			"Get detailed information about a specific Capacities space including structures and collections",
		inputSchema: {
			type: "object" as const,
			properties: {
				spaceId: {
					type: "string",
					description: "The UUID of the space to get information for",
				},
			},
			required: ["spaceId"],
		},
	},
	{
		name: "capacities_search",
		description:
			"Search for content across Capacities spaces with optional filtering",
		inputSchema: {
			type: "object" as const,
			properties: {
				searchTerm: {
					type: "string",
					description: "The search term to look for",
				},
				spaceIds: {
					type: "array",
					items: { type: "string" },
					description: "Array of space UUIDs to search in",
				},
				mode: {
					type: "string",
					enum: ["fullText", "title"],
					description: "Search mode: fullText or title only (default: title)",
				},
				filterStructureIds: {
					type: "array",
					items: { type: "string" },
					description: "Optional array of structure IDs to filter results",
				},
			},
			required: ["searchTerm", "spaceIds"],
		},
	},
	{
		name: "capacities_read_object_content",
		description:
			"Retrieve the full content of a Capacities object by its ID. Optionally provide a title or search term to improve results. This tries undocumented endpoints first, then falls back to search API aggregation.",
		inputSchema: {
			type: "object" as const,
			properties: {
				objectId: {
					type: "string",
					description:
						"The UUID of the object to retrieve. You can get this from 'Copy object reference' in Capacities.",
				},
				spaceId: {
					type: "string",
					description: "The UUID of the space containing the object",
				},
				title: {
					type: "string",
					description:
						"Optional: The title or partial title of the object to search for. This improves search results.",
				},
			},
			required: ["objectId", "spaceId"],
		},
	},
	{
		name: "capacities_save_weblink",
		description:
			"Save a web link to a Capacities space with optional title and tags",
		inputSchema: {
			type: "object" as const,
			properties: {
				spaceId: {
					type: "string",
					description: "The UUID of the space to save the weblink to",
				},
				url: {
					type: "string",
					description: "The URL to save",
				},
				titleOverwrite: {
					type: "string",
					description: "Optional custom title for the weblink",
				},
				descriptionOverwrite: {
					type: "string",
					description: "Optional description for the weblink",
				},
				tags: {
					type: "array",
					items: { type: "string" },
					description:
						"Optional Tags to add to the weblink. Tags need to exactly match your tag names in Capacities, otherwise they will be created.",
				},
				mdText: {
					type: "string",
					description:
						"Text formatted as markdown that will be added to the notes section",
				},
			},
			required: ["spaceId", "url"],
		},
	},
	{
		name: "capacities_save_to_daily_note",
		description:
			"Add markdown text to today's daily note in a Capacities space",
		inputSchema: {
			type: "object" as const,
			properties: {
				spaceId: {
					type: "string",
					description: "The UUID of the space to save to the daily note",
				},
				mdText: {
					type: "string",
					description: "The markdown text to add to today's daily note",
				},
				origin: {
					type: "string",
					enum: ["commandPalette"],
					description:
						"Optional origin label for the content (only 'commandPalette' is supported)",
				},
				noTimestamp: {
					type: "boolean",
					description: "If true, no time stamp will be added to the note",
				},
			},
			required: ["spaceId", "mdText"],
		},
	},
];

// Prompt definitions
const PROMPTS = [
	{
		name: "capacities-daily-summary",
		description:
			"Create a structured daily summary for your Capacities daily note",
		arguments: [
			{
				name: "key_activities",
				description: "Main activities or events from today",
				required: true,
			},
			{
				name: "insights",
				description: "Key insights, learnings, or realizations",
				required: false,
			},
			{
				name: "tomorrow_focus",
				description: "What you want to focus on tomorrow",
				required: false,
			},
		],
	},
	{
		name: "capacities-research-note",
		description: "Format research findings for saving to Capacities",
		arguments: [
			{
				name: "topic",
				description: "The research topic or subject",
				required: true,
			},
			{
				name: "source_url",
				description: "URL of the source material",
				required: false,
			},
			{
				name: "key_points",
				description: "Main findings or key points",
				required: true,
			},
			{
				name: "questions",
				description: "Follow-up questions or areas to explore",
				required: false,
			},
		],
	},
	{
		name: "capacities-meeting-notes",
		description: "Structure meeting notes for Capacities daily note",
		arguments: [
			{
				name: "meeting_title",
				description: "Title or topic of the meeting",
				required: true,
			},
			{
				name: "attendees",
				description: "Who attended the meeting",
				required: false,
			},
			{
				name: "key_decisions",
				description: "Important decisions made",
				required: false,
			},
			{
				name: "action_items",
				description: "Action items and next steps",
				required: false,
			},
			{
				name: "notes",
				description: "Additional notes or discussion points",
				required: false,
			},
		],
	},
	{
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
				description:
					"Comma-separated tags (e.g., 'remote, senior, typescript')",
				required: false,
			},
			{
				name: "status",
				description:
					"Application status (e.g., 'Applied', 'Interview', 'Offer')",
				required: false,
			},
		],
	},
];

// Tool handlers
async function handleListSpaces(): Promise<string> {
	const response = await makeApiRequest("/spaces");
	const data = await response.json();
	return JSON.stringify(data, null, 2);
}

async function handleGetSpaceInfo(args: { spaceId: string }): Promise<string> {
	const response = await makeApiRequest(`/space-info?spaceid=${args.spaceId}`);
	const data = await response.json();
	return JSON.stringify(data, null, 2);
}

async function handleSearch(args: {
	searchTerm: string;
	spaceIds: string[];
	mode?: string;
	filterStructureIds?: string[];
}): Promise<string> {
	const requestBody = {
		searchTerm: args.searchTerm,
		spaceIds: args.spaceIds,
		...(args.mode && { mode: args.mode }),
		...(args.filterStructureIds && {
			filterStructureIds: args.filterStructureIds,
		}),
	};

	const response = await makeApiRequest("/search", {
		method: "POST",
		body: JSON.stringify(requestBody),
	});

	const data = await response.json();
	return JSON.stringify(data, null, 2);
}

async function handleReadObjectContent(args: {
	objectId: string;
	spaceId: string;
	title?: string;
}): Promise<string> {
	const apiKey = getApiKey();

	// Try potential undocumented endpoints first
	const potentialEndpoints = [
		`/object/${args.objectId}`,
		`/objects/${args.objectId}`,
		`/content/${args.objectId}`,
		`/space/${args.spaceId}/object/${args.objectId}`,
	];

	for (const endpoint of potentialEndpoints) {
		try {
			const response = await fetch(`${API_BASE_URL}${endpoint}`, {
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				const data = await response.json();
				return JSON.stringify(
					{
						note: `Successfully retrieved from undocumented endpoint: ${endpoint}`,
						object: data,
					},
					null,
					2,
				);
			}
		} catch {
			// Continue to next endpoint
		}
	}

	// Fallback to search API approach
	const searchTerm = args.title || "*";

	const requestBody = {
		searchTerm: searchTerm,
		spaceIds: [args.spaceId],
		mode: "fullText" as const,
	};

	const searchResponse = await fetch(`${API_BASE_URL}/search`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(requestBody),
	});

	if (!searchResponse.ok) {
		throw new Error(
			`Search API error: ${searchResponse.status} ${searchResponse.statusText}`,
		);
	}

	const data = (await searchResponse.json()) as {
		results?: Array<{
			id?: string;
			title?: string;
			highlights?: Array<{
				snippets?: string[];
				context?: { field?: string; [key: string]: unknown };
				score?: number;
				[key: string]: unknown;
			}>;
			snippet?: string;
			[key: string]: unknown;
		}>;
	};

	if (!data || !data.results || data.results.length === 0) {
		return JSON.stringify(
			{
				error: "Object not found",
				message:
					"No results found. Try providing the 'title' parameter to search for the object.",
				searchTerm: searchTerm,
			},
			null,
			2,
		);
	}

	// Find the exact match by ID
	const exactMatch = data.results.find((result) => result.id === args.objectId);

	if (!exactMatch) {
		return JSON.stringify(
			{
				error: "Object not found by ID",
				message: `Found ${data.results.length} results but none matched object ID ${args.objectId}. Try searching by title first.`,
				availableResults: data.results.map((r) => ({
					id: r.id,
					title: r.title,
				})),
			},
			null,
			2,
		);
	}

	// Aggregate content from highlights and snippets
	const aggregatedContent: string[] = [];

	if (exactMatch.snippet && typeof exactMatch.snippet === "string") {
		aggregatedContent.push(exactMatch.snippet);
	}

	if (exactMatch.highlights && Array.isArray(exactMatch.highlights)) {
		for (const highlight of exactMatch.highlights) {
			if (highlight.snippets && Array.isArray(highlight.snippets)) {
				for (const snippet of highlight.snippets) {
					if (typeof snippet === "string" && snippet.trim()) {
						aggregatedContent.push(snippet);
					}
				}
			}
		}
	}

	const otherContentFields = [
		"content",
		"text",
		"body",
		"description",
		"mdText",
	];
	for (const field of otherContentFields) {
		const value = exactMatch[field];
		if (value && typeof value === "string" && value.trim()) {
			aggregatedContent.push(`[${field}]: ${value}`);
		}
	}

	return JSON.stringify(
		{
			note: "Content retrieved via search API. This may be incomplete - search only returns snippets/highlights.",
			object: {
				id: exactMatch.id,
				title: exactMatch.title,
				aggregatedContent:
					aggregatedContent.length > 0
						? aggregatedContent.join("\n\n---\n\n")
						: "No content snippets available",
				snippetCount: aggregatedContent.length,
				highlights: exactMatch.highlights,
				rawResult: exactMatch,
			},
		},
		null,
		2,
	);
}

async function handleSaveWeblink(args: {
	spaceId: string;
	url: string;
	titleOverwrite?: string;
	descriptionOverwrite?: string;
	tags?: string[];
	mdText?: string;
}): Promise<string> {
	const requestBody = {
		spaceId: args.spaceId,
		url: args.url,
		...(args.titleOverwrite && { titleOverwrite: args.titleOverwrite }),
		...(args.descriptionOverwrite && {
			descriptionOverwrite: args.descriptionOverwrite,
		}),
		...(args.tags && { tags: args.tags }),
		...(args.mdText && { mdText: args.mdText }),
	};

	const response = await makeApiRequest("/save-weblink", {
		method: "POST",
		body: JSON.stringify(requestBody),
	});

	const responseText = await response.text();
	if (!responseText.trim()) {
		return "Success: Weblink saved (no response data)";
	}

	try {
		const data = JSON.parse(responseText);
		return JSON.stringify(data, null, 2);
	} catch {
		return `Success: Weblink saved. Response: ${responseText}`;
	}
}

async function handleSaveToDailyNote(args: {
	spaceId: string;
	mdText: string;
	origin?: string;
	noTimestamp?: boolean;
}): Promise<string> {
	const requestBody = {
		spaceId: args.spaceId,
		mdText: args.mdText,
		...(args.origin && { origin: args.origin }),
		...(args.noTimestamp !== undefined && { noTimestamp: args.noTimestamp }),
	};

	const response = await makeApiRequest("/save-to-daily-note", {
		method: "POST",
		body: JSON.stringify(requestBody),
	});

	const responseText = await response.text();
	if (!responseText.trim()) {
		return "Success: Content saved to daily note (no response data)";
	}

	try {
		const data = JSON.parse(responseText);
		return JSON.stringify(data, null, 2);
	} catch {
		return `Success: Content saved to daily note. Response: ${responseText}`;
	}
}

// Prompt handlers
function handleDailySummaryPrompt(args: Record<string, string>): string {
	let summary = `## Daily Summary - ${new Date().toLocaleDateString()}\n\n`;
	summary += `### Key Activities\n${args.key_activities}\n\n`;

	if (args.insights) {
		summary += `### Insights & Learnings\n${args.insights}\n\n`;
	}

	if (args.tomorrow_focus) {
		summary += `### Tomorrow's Focus\n${args.tomorrow_focus}\n\n`;
	}

	summary += `---\n*Generated at ${new Date().toLocaleTimeString()}*`;

	return `Use this formatted summary for a Capacities daily note:\n\n${summary}`;
}

function handleResearchNotePrompt(args: Record<string, string>): string {
	let note = `# Research: ${args.topic}\n\n`;

	if (args.source_url) {
		note += `**Source:** ${args.source_url}\n\n`;
	}

	note += `## Key Findings\n${args.key_points}\n\n`;

	if (args.questions) {
		note += `## Questions to Explore\n${args.questions}\n\n`;
	}

	note += `---\n*Research note created on ${new Date().toLocaleDateString()}*`;

	return `Here's a formatted research note ready for Capacities:\n\n${note}\n\nWould you like me to save this to your Capacities space?`;
}

function handleMeetingNotesPrompt(args: Record<string, string>): string {
	let meeting = `## Meeting: ${args.meeting_title}\n`;
	meeting += `**Date:** ${new Date().toLocaleDateString()}\n`;

	if (args.attendees) {
		meeting += `**Attendees:** ${args.attendees}\n`;
	}
	meeting += "\n";

	if (args.key_decisions) {
		meeting += `### Decisions\n${args.key_decisions}\n\n`;
	}

	if (args.action_items) {
		meeting += `### Action Items\n${args.action_items}\n\n`;
	}

	if (args.notes) {
		meeting += `### Notes\n${args.notes}\n\n`;
	}

	return `Here are your structured meeting notes:\n\n${meeting}Ready to add to your Capacities daily note?`;
}

function handleJobApplicationPrompt(args: Record<string, string>): string {
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
}

// Main server setup
const server = new Server(
	{
		name: "capacities-mcp",
		version: "1.2.0",
	},
	{
		capabilities: {
			tools: {},
		},
	},
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
	return { tools: TOOLS };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	try {
		let result: string;

		switch (name) {
			case "capacities_list_spaces":
				result = await handleListSpaces();
				break;
			case "capacities_get_space_info":
				result = await handleGetSpaceInfo(args as { spaceId: string });
				break;
			case "capacities_search":
				result = await handleSearch(
					args as {
						searchTerm: string;
						spaceIds: string[];
						mode?: string;
						filterStructureIds?: string[];
					},
				);
				break;
			case "capacities_read_object_content":
				result = await handleReadObjectContent(
					args as { objectId: string; spaceId: string; title?: string },
				);
				break;
			case "capacities_save_weblink":
				result = await handleSaveWeblink(
					args as {
						spaceId: string;
						url: string;
						titleOverwrite?: string;
						descriptionOverwrite?: string;
						tags?: string[];
						mdText?: string;
					},
				);
				break;
			case "capacities_save_to_daily_note":
				result = await handleSaveToDailyNote(
					args as {
						spaceId: string;
						mdText: string;
						origin?: string;
						noTimestamp?: boolean;
					},
				);
				break;
			default:
				throw new Error(`Unknown tool: ${name}`);
		}

		return {
			content: [{ type: "text", text: result }],
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			content: [{ type: "text", text: `Error: ${errorMessage}` }],
			isError: true,
		};
	}
});

// List prompts handler
server.setRequestHandler(ListPromptsRequestSchema, async () => {
	return { prompts: PROMPTS };
});

// Get prompt handler
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;
	const promptArgs = (args || {}) as Record<string, string>;

	let result: string;

	switch (name) {
		case "capacities-daily-summary":
			result = handleDailySummaryPrompt(promptArgs);
			break;
		case "capacities-research-note":
			result = handleResearchNotePrompt(promptArgs);
			break;
		case "capacities-meeting-notes":
			result = handleMeetingNotesPrompt(promptArgs);
			break;
		case "capacities-job-application":
			result = handleJobApplicationPrompt(promptArgs);
			break;
		default:
			throw new Error(`Unknown prompt: ${name}`);
	}

	return {
		messages: [
			{
				role: "user",
				content: { type: "text", text: result },
			},
		],
	};
});

// Start the server
async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Capacities MCP server running on stdio");
}

main().catch((error) => {
	console.error("Server error:", error);
	process.exit(1);
});
