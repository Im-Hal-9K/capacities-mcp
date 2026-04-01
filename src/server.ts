#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { makeApiRequest } from "./api.js";

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
			"Get information about a Capacities space's structures and collections. By default returns the full schema including all property definitions. Use 'summary' mode to get a lightweight listing of just structure names/IDs (saves context window). Use 'filterStructureIds' to fetch schema for only specific structures. Use 'excludeMediaTypes' to skip built-in media structures (Image, File, PDF, Weblink).",
		inputSchema: {
			type: "object" as const,
			properties: {
				spaceId: {
					type: "string",
					description: "The UUID of the space to get information for",
				},
				summary: {
					type: "boolean",
					description:
						"If true, returns only structure names, IDs, and collection info — no property definitions. Much smaller payload, ideal for discovery/lookup. Default: false",
				},
				filterStructureIds: {
					type: "array",
					items: { type: "string" },
					description:
						"Only return structures matching these IDs. Use this when you only need the schema for specific structures (e.g. just 'Project' and 'Note').",
				},
				excludeMediaTypes: {
					type: "boolean",
					description:
						"If true, excludes built-in media structures (Image, File, PDF, Weblink) whose schemas rarely change. Default: false",
				},
			},
			required: ["spaceId"],
		},
	},
	{
		name: "capacities_search",
		description:
			"Search for content across Capacities spaces with optional filtering. Uses the /lookup endpoint (title-based, faster) with fallback to legacy /search.",
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
			"Retrieve the full content of a Capacities object by its ID. Providing a title is strongly recommended as the API uses title-based lookup. Falls back through multiple search strategies to find the object.",
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

// Tool handlers
async function handleListSpaces(): Promise<string> {
	const response = await makeApiRequest("/spaces");
	const data = await response.json();
	return JSON.stringify(data, null, 2);
}

// Built-in media structure titles that can be excluded
const MEDIA_STRUCTURE_TITLES = new Set(["image", "file", "pdf", "weblink"]);

async function handleGetSpaceInfo(args: {
	spaceId: string;
	summary?: boolean;
	filterStructureIds?: string[];
	excludeMediaTypes?: boolean;
}): Promise<string> {
	const response = await makeApiRequest(`/space-info?spaceid=${args.spaceId}`);
	const data = (await response.json()) as {
		structures?: Array<{
			id: string;
			title: string;
			pluralName: string;
			labelColor: string;
			propertyDefinitions: Array<{
				id: string;
				type: string;
				dataType: string;
				name: string;
			}>;
			collections: Array<{ id: string; title: string }>;
		}>;
	};

	if (!data.structures) {
		return JSON.stringify(data, null, 2);
	}

	let structures = data.structures;

	// Filter to specific structure IDs if requested
	if (args.filterStructureIds && args.filterStructureIds.length > 0) {
		const filterSet = new Set(args.filterStructureIds);
		structures = structures.filter((s) => filterSet.has(s.id));
	}

	// Exclude built-in media types if requested
	if (args.excludeMediaTypes) {
		structures = structures.filter(
			(s) => !MEDIA_STRUCTURE_TITLES.has(s.title.toLowerCase()),
		);
	}

	// Return summary (no property definitions) if requested
	if (args.summary) {
		const summary = structures.map((s) => ({
			id: s.id,
			title: s.title,
			pluralName: s.pluralName,
			labelColor: s.labelColor,
			propertyCount: s.propertyDefinitions?.length ?? 0,
			collections: s.collections,
		}));
		return JSON.stringify({ structures: summary }, null, 2);
	}

	return JSON.stringify({ structures }, null, 2);
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
		mode: args.mode || "title",
		...(args.filterStructureIds && {
			filterStructureIds: args.filterStructureIds,
		}),
	};

	// Try /lookup first (replaces deprecated /search endpoint)
	// Fall back to /search if /lookup returns 4xx (graceful migration)
	let response: Response;
	try {
		response = await makeApiRequest("/lookup", {
			method: "POST",
			body: JSON.stringify(requestBody),
		});
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		if (errorMsg.includes("404") || errorMsg.includes("400")) {
			response = await makeApiRequest("/search", {
				method: "POST",
				body: JSON.stringify(requestBody),
			});
		} else {
			throw error;
		}
	}

	const data = await response.json();
	return JSON.stringify(data, null, 2);
}

async function handleReadObjectContent(args: {
	objectId: string;
	spaceId: string;
	title?: string;
}): Promise<string> {
	// Search for the object using the lookup API (replaces deprecated /search)
	const searchTerm = args.title || "*";

	// Try /lookup with fullText first, fall back to title mode, then legacy /search
	let response: Response;
	const baseBody = {
		searchTerm: searchTerm,
		spaceIds: [args.spaceId],
	};

	try {
		response = await makeApiRequest("/lookup", {
			method: "POST",
			body: JSON.stringify({ ...baseBody, mode: "fullText" }),
		});
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		if (errorMsg.includes("404") || errorMsg.includes("400")) {
			// fullText not supported on /lookup, try title mode
			try {
				response = await makeApiRequest("/lookup", {
					method: "POST",
					body: JSON.stringify({ ...baseBody, mode: "title" }),
				});
			} catch (innerError) {
				const innerMsg =
					innerError instanceof Error ? innerError.message : String(innerError);
				if (innerMsg.includes("404") || innerMsg.includes("400")) {
					// /lookup not available at all, fall back to legacy /search
					response = await makeApiRequest("/search", {
						method: "POST",
						body: JSON.stringify({ ...baseBody, mode: "fullText" }),
					});
				} else {
					throw innerError;
				}
			}
		} else {
			throw error;
		}
	}

	const data = (await response.json()) as {
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
				result = await handleGetSpaceInfo(
					args as {
						spaceId: string;
						summary?: boolean;
						filterStructureIds?: string[];
						excludeMediaTypes?: boolean;
					},
				);
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
