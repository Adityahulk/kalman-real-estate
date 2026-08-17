export async function crmRequest<T>(url: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
  const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => null) as { ok?: boolean; data?: T; error?: string } | null;
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || `Request failed with HTTP ${response.status}.`);
  return payload.data as T;
}

export function inputDateTime(value?: Date | string | null) {
  const date = value ? new Date(value) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
