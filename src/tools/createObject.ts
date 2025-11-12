import { z } from "zod";
import { makeApiRequest } from "../api.js";

export const createObjectTool = {
	annotations: {
		openWorldHint: true,
		readOnlyHint: false,
		title: "Create Object in Capacities",
	},
	description:
		"Create a new object (entry) in a Capacities space. Objects can be of various types like Area, Resource, Archive, Project, or custom types defined in your space.",
	execute: async (args: {
		spaceId: string;
		typeId: string;
		title: string;
		mdText?: string;
		properties?: Record<string, unknown>;
	}) => {
		try {
			const requestBody = {
				typeId: args.typeId,
				title: args.title,
				...(args.mdText && { mdText: args.mdText }),
				...(args.properties && { properties: args.properties }),
			};

			const response = await makeApiRequest(
				`/spaces/${args.spaceId}/objects`,
				{
					method: "POST",
					body: JSON.stringify(requestBody),
				},
			);

			const data = await response.json();
			return JSON.stringify(data, null, 2);
		} catch (error) {
			throw new Error(
				`Failed to create object: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},
	name: "capacities_create_object",
	parameters: z.object({
		spaceId: z
			.string()
			.uuid()
			.describe("The UUID of the space to create the object in"),
		typeId: z
			.string()
			.uuid()
			.describe(
				"The UUID of the object type (e.g., Area, Resource, Project, or custom type). Use capacities_get_space_info to find available types.",
			),
		title: z.string().min(1).max(500).describe("The title of the new object"),
		mdText: z
			.string()
			.max(200000)
			.optional()
			.describe(
				"Optional markdown content for the object's main content/notes section",
			),
		properties: z
			.record(z.unknown())
			.optional()
			.describe(
				"Optional object with property IDs as keys and their values. Use capacities_get_space_info to find available properties for the object type.",
			),
	}),
};
