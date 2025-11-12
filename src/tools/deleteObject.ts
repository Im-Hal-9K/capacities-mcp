import { z } from "zod";
import { makeApiRequest } from "../api.js";

export const deleteObjectTool = {
	annotations: {
		openWorldHint: true,
		readOnlyHint: false,
		title: "Delete Object from Capacities",
	},
	description:
		"Delete an object (entry) from a Capacities space. This action is permanent and cannot be undone.",
	execute: async (args: { spaceId: string; objectId: string }) => {
		try {
			const response = await makeApiRequest(
				`/spaces/${args.spaceId}/objects/${args.objectId}`,
				{
					method: "DELETE",
				},
			);

			const responseText = await response.text();
			if (!responseText.trim()) {
				return "Success: Object deleted";
			}

			try {
				const data = JSON.parse(responseText);
				return JSON.stringify(data, null, 2);
			} catch (parseError) {
				return `Success: Object deleted. Response: ${responseText}`;
			}
		} catch (error) {
			throw new Error(
				`Failed to delete object: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},
	name: "capacities_delete_object",
	parameters: z.object({
		spaceId: z
			.string()
			.uuid()
			.describe("The UUID of the space containing the object"),
		objectId: z
			.string()
			.uuid()
			.describe("The UUID of the object to delete"),
	}),
};
