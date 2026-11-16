export interface ApiError {
  error?: string;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    let message = "The request could not be completed.";
    try {
      const body = await response.json() as ApiError;
      if (typeof body.error === "string") message = body.error;
    } catch {
      // Keep a generic message when the API does not return JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The request could not be completed.";
}
