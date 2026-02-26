type ApiErrorPayload = {
  message?: string;
  error?: string;
};

export const readApiErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as ApiErrorPayload;
      if (payload.message) return payload.message;
      if (payload.error) return payload.error;
      return fallback;
    }

    const text = await response.text();
    return text.trim() || fallback;
  } catch {
    return fallback;
  }
};
