#!/usr/bin/env node
import { FastMCP } from "fastmcp";

import {
	batchOperationsTool,
	createObjectTool,
	deleteObjectTool,
	getSpaceInfoTool,
	listSpacesTool,
	readObjectContentTool,
	saveToDailyNoteTool,
	saveWeblinkTool,
	searchTool,
	updateObjectTool,
} from "./tools/index.js";

import {
	dailySummaryPrompt,
	meetingNotesPrompt,
	researchNotePrompt,
} from "./prompts/index.js";

const server = new FastMCP({
	name: "Capacities",
	version: "1.0.1",
});

// Register all tools
server.addTool(listSpacesTool);
server.addTool(getSpaceInfoTool);
server.addTool(searchTool);
server.addTool(readObjectContentTool);
server.addTool(saveWeblinkTool);
server.addTool(saveToDailyNoteTool);
server.addTool(createObjectTool);
server.addTool(updateObjectTool);
server.addTool(deleteObjectTool);
server.addTool(batchOperationsTool);

// Register all prompts
server.addPrompt(dailySummaryPrompt);
server.addPrompt(researchNotePrompt);
server.addPrompt(meetingNotesPrompt);

server.start({
	transportType: "stdio",
});
