import { z } from "zod";
import { makeApiRequest } from "../api.js";

const BatchOperationSchema = z.object({
	operation: z
		.enum(["create", "update", "delete"])
		.describe("The operation to perform: create, update, or delete"),
	objectId: z
		.string()
		.uuid()
		.optional()
		.describe(
			"The UUID of the object (required for update and delete operations)",
		),
	typeId: z
		.string()
		.uuid()
		.optional()
		.describe("The UUID of the object type (required for create operations)"),
	title: z
		.string()
		.max(500)
		.optional()
		.describe("Title for the object (required for create, optional for update)"),
	mdText: z
		.string()
		.max(200000)
		.optional()
		.describe("Optional markdown content for the object"),
	properties: z
		.record(z.unknown())
		.optional()
		.describe("Optional properties to set or update"),
});

export const batchOperationsTool = {
	annotations: {
		openWorldHint: true,
		readOnlyHint: false,
		title: "Batch Operations in Capacities",
	},
	description:
		"Perform multiple create, update, or delete operations on objects in a Capacities space in a single API call. This is more efficient than making individual calls for each operation.",
	execute: async (args: {
		spaceId: string;
		operations: Array<{
			operation: "create" | "update" | "delete";
			objectId?: string;
			typeId?: string;
			title?: string;
			mdText?: string;
			properties?: Record<string, unknown>;
		}>;
	}) => {
		try {
			// Validate operations
			for (const op of args.operations) {
				if (op.operation === "create" && (!op.typeId || !op.title)) {
					throw new Error(
						"Create operations require both 'typeId' and 'title' fields",
					);
				}
				if (
					(op.operation === "update" || op.operation === "delete") &&
					!op.objectId
				) {
					throw new Error(
						`${op.operation} operations require 'objectId' field`,
					);
				}
			}

			const requestBody = {
				operations: args.operations,
			};

			const response = await makeApiRequest(
				`/spaces/${args.spaceId}/objects/batch`,
				{
					method: "POST",
					body: JSON.stringify(requestBody),
				},
			);

			const data = await response.json();
			return JSON.stringify(data, null, 2);
		} catch (error) {
			throw new Error(
				`Failed to perform batch operations: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},
	name: "capacities_batch_operations",
	parameters: z.object({
		spaceId: z
			.string()
			.uuid()
			.describe("The UUID of the space to perform operations in"),
		operations: z
			.array(BatchOperationSchema)
			.min(1)
			.max(100)
			.describe(
				"Array of operations to perform. Each operation must specify the operation type (create/update/delete) and required fields for that operation.",
			),
	}),
};
