# Capacities API Limitations

This document tracks the current state of the Capacities API and known limitations.

## API Status

The Capacities API is in **early beta**. Many standard REST API endpoints are not yet available.

## Currently Available Endpoints

These endpoints are implemented and working in this MCP server:

| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| `/spaces` | GET | `capacities_list_spaces` | List all personal spaces |
| `/space-info` | POST | `capacities_get_space_info` | Get detailed space information including structures |
| `/search` | POST | `capacities_search` | Search for content across spaces |
| `/save-weblink` | POST | `capacities_save_weblink` | Save a web link to a space |
| `/save-to-daily-note` | POST | `capacities_save_to_daily_note` | Add markdown text to today's daily note |

## Known Missing Functionality

The following operations are **NOT yet available** in the Capacities API:

### CRUD Operations
- ❌ **Create Object**: No endpoint exists to create arbitrary objects
- ❌ **Update Object**: No endpoint exists to modify existing objects
- ❌ **Delete Object**: No endpoint exists to delete objects
- ❌ **Batch Operations**: No endpoint exists for bulk operations

### Why These Don't Work
The Capacities API currently only supports:
- Reading data (GET requests for spaces)
- Writing to specific specialized endpoints (weblinks, daily notes)
- Searching existing content

Standard RESTful CRUD operations (POST/PUT/PATCH/DELETE for arbitrary objects) are not yet implemented by Capacities.

## When Will These Be Available?

According to Capacities documentation: *"More endpoints will be added as the feature set grows."*

This MCP server will be updated to support CRUD operations once they become available in the Capacities API.

## API Documentation Access

As of the last check, these documentation URLs returned 403 errors:
- `https://api.capacities.io/openapi.json`
- `https://api.capacities.io/docs/`
- `https://docs.capacities.io/developer/api`

The API is in private/limited beta access.

## Implementation Notes

If you need to create, update, or delete objects:
- Use the Capacities web interface or desktop app
- Wait for API support to be added
- Do not attempt to reverse-engineer undocumented endpoints

## Last Updated

November 2025
