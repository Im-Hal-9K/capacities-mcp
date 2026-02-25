export const API_BASE_URL = "https://api.capacities.io";

export function getApiKey(): string {
	const apiKey = process.env.CAPACITIES_API_KEY;
	if (!apiKey) {
		throw new Error("CAPACITIES_API_KEY environment variable is required");
	}
	return apiKey;
}

export async function makeApiRequest(
	endpoint: string,
	options: RequestInit = {},
): Promise<Response> {
	const apiKey = getApiKey();

	const requestOptions = {
		...options,
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
			...options.headers,
		},
	};

	const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);

	if (!response.ok) {
		const errorText = await response.text();
		if (response.status === 500) {
			throw new Error(
				`Capacities API returned 500 Internal Server Error on ${endpoint}. This is a server-side issue with the Capacities API. Response: ${errorText}`,
			);
		}
		if (response.status === 429) {
			throw new Error(
				`Capacities API rate limit exceeded on ${endpoint}. Please wait before retrying.`,
			);
		}
		throw new Error(
			`Capacities API error: ${response.status} ${response.statusText} on ${endpoint} - ${errorText}`,
		);
	}

	return response;
}
