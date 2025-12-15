#!/usr/bin/env node
import { FastMCP } from "fastmcp";

import {
	getSpaceInfoTool,
	listSpacesTool,
	readObjectContentTool,
	saveToDailyNoteTool,
	saveWeblinkTool,
	searchTool,
} from "./tools/index.js";

import {
	dailySummaryPrompt,
	jobApplicationPrompt,
	meetingNotesPrompt,
	researchNotePrompt,
} from "./prompts/index.js";

const server = new FastMCP({
	name: "Capacities",
	version: "1.1.0",
});

// Register all tools
server.addTool(listSpacesTool);
server.addTool(getSpaceInfoTool);
server.addTool(searchTool);
server.addTool(readObjectContentTool);
server.addTool(saveWeblinkTool);
server.addTool(saveToDailyNoteTool);

// Register all prompts
server.addPrompt(dailySummaryPrompt);
server.addPrompt(researchNotePrompt);
server.addPrompt(meetingNotesPrompt);
server.addPrompt(jobApplicationPrompt);

server.start({
	transportType: "stdio",
});
