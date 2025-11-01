import { z } from "zod";
import { API_BASE_URL, getApiKey } from "../api.js";

export const readObjectContentTool = {
	annotations: {
		openWorldHint: true,
		readOnlyHint: true,
		title: "Read Object Content",
	},
	description:
		"Retrieve the full content of a Capacities object by its ID. Optionally provide a title or search term to improve results. This tries undocumented endpoints first, then falls back to search API aggregation.",
	execute: async (args: {
		objectId: string;
		spaceId: string;
		title?: string;
	}) => {
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
			} catch (error) {
				// Continue to next endpoint
			}
		}

		// Fallback to search API approach
		try {
			// Search using title if provided, otherwise use a wildcard search
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
						message: `No results found. Try providing the 'title' parameter to search for the object.`,
						searchTerm: searchTerm,
					},
					null,
					2,
				);
			}

			// Find the exact match by ID
			const exactMatch = data.results.find(
				(result) => result.id === args.objectId,
			);

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

			// Try to extract snippet
			if (exactMatch.snippet && typeof exactMatch.snippet === "string") {
				aggregatedContent.push(exactMatch.snippet);
			}

			// Extract from highlights array - each highlight has a snippets array
			if (exactMatch.highlights && Array.isArray(exactMatch.highlights)) {
				for (const highlight of exactMatch.highlights) {
					// The highlight object has a "snippets" array containing the actual text
					if (highlight.snippets && Array.isArray(highlight.snippets)) {
						for (const snippet of highlight.snippets) {
							if (typeof snippet === "string" && snippet.trim()) {
								aggregatedContent.push(snippet);
							}
						}
					}
				}
			}

			// Also try other common content fields on the result object
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
		} catch (error) {
			throw new Error(
				`Failed to read object content: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},
	name: "capacities_read_object_content",
	parameters: z.object({
		objectId: z
			.string()
			.uuid()
			.describe(
				"The UUID of the object to retrieve. You can get this from 'Copy object reference' in Capacities.",
			),
		spaceId: z
			.string()
			.uuid()
			.describe("The UUID of the space containing the object"),
		title: z
			.string()
			.optional()
			.describe(
				"Optional: The title or partial title of the object to search for. This improves search results.",
			),
	}),
};
