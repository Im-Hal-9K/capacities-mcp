import { describe, expect, test } from "bun:test";
import { readObjectContentTool } from "./readObjectContent.js";

describe("readObjectContentTool", () => {
	test("should have correct metadata", () => {
		expect(readObjectContentTool.name).toBe("capacities_read_object_content");
		expect(readObjectContentTool.description).toContain(
			"Retrieve the full content",
		);
		expect(readObjectContentTool.annotations.readOnlyHint).toBe(true);
		expect(readObjectContentTool.annotations.openWorldHint).toBe(true);
		expect(readObjectContentTool.annotations.title).toBe("Read Object Content");
	});

	test("should have correct parameter schema", () => {
		expect(readObjectContentTool.parameters).toBeDefined();
		expect(typeof readObjectContentTool.execute).toBe("function");

		// Validate that parameters require objectId and spaceId
		const params = readObjectContentTool.parameters.shape;
		expect(params.objectId).toBeDefined();
		expect(params.spaceId).toBeDefined();
	});
});
