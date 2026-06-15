type ApiPayload<T> = { ok?: boolean; data?: T; error?: string; issues?: Array<{ path?: Array<string | number>; message?: string }> };

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(input, init);
    const payload = await readJson<T>(response);
    if (!response.ok) {
      const issue = payload.issues?.[0];
      const detail = issue?.message ? `${issue.path?.join(".") || "Field"}: ${issue.message}` : "";
      throw new ApiClientError(detail || payload.error || `Request failed with HTTP ${response.status}`, response.status);
    }
    if (payload.data === undefined) throw new ApiClientError("The server returned an incomplete response.", response.status);
    return payload.data;
  } catch (error) {
    console.error("[widestate:client-request]", { input: String(input), error });
    if (error instanceof ApiClientError) throw error;
    throw new ApiClientError("Could not connect to the server. Please try again.", 0);
  }
}

async function readJson<T>(response: Response): Promise<ApiPayload<T>> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as ApiPayload<T>;
  } catch {
    throw new ApiClientError(`The server returned an invalid response (HTTP ${response.status}).`, response.status);
  }
}

export class ApiClientError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiClientError";
  }
}
