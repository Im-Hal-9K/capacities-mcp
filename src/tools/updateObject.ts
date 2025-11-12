import { z } from "zod";
import { makeApiRequest } from "../api.js";

export const updateObjectTool = {
	annotations: {
		openWorldHint: true,
		readOnlyHint: false,
		title: "Update Object in Capacities",
	},
	description:
		"Update an existing object (entry) in a Capacities space. You can update the title, content, or properties of the object.",
	execute: async (args: {
		spaceId: string;
		objectId: string;
		title?: string;
		mdText?: string;
		properties?: Record<string, unknown>;
	}) => {
		try {
			const requestBody = {
				...(args.title && { title: args.title }),
				...(args.mdText && { mdText: args.mdText }),
				...(args.properties && { properties: args.properties }),
			};

			// At least one field must be provided
			if (Object.keys(requestBody).length === 0) {
				throw new Error(
					"At least one field (title, mdText, or properties) must be provided for update",
				);
			}

			const response = await makeApiRequest(
				`/spaces/${args.spaceId}/objects/${args.objectId}`,
				{
					method: "PUT",
					body: JSON.stringify(requestBody),
				},
			);

			const responseText = await response.text();
			if (!responseText.trim()) {
				return "Success: Object updated (no response data)";
			}

			try {
				const data = JSON.parse(responseText);
				return JSON.stringify(data, null, 2);
			} catch (parseError) {
				return `Success: Object updated. Response: ${responseText}`;
			}
		} catch (error) {
			throw new Error(
				`Failed to update object: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},
	name: "capacities_update_object",
	parameters: z.object({
		spaceId: z
			.string()
			.uuid()
			.describe("The UUID of the space containing the object"),
		objectId: z.string().uuid().describe("The UUID of the object to update"),
		title: z
			.string()
			.min(1)
			.max(500)
			.optional()
			.describe("Optional new title for the object"),
		mdText: z
			.string()
			.max(200000)
			.optional()
			.describe(
				"Optional markdown content to replace the object's main content. This will replace existing content, not append.",
			),
		properties: z
			.record(z.unknown())
			.optional()
			.describe(
				"Optional object with property IDs as keys and their new values. Only specified properties will be updated.",
			),
	}),
};
