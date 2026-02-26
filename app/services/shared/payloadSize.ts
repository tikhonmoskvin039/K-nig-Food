export const VERCEL_FUNCTION_BODY_LIMIT_BYTES = 4.5 * 1024 * 1024;
export const SAFE_FUNCTION_BODY_LIMIT_BYTES = 4.2 * 1024 * 1024;

export const getJsonPayloadSizeBytes = (value: unknown): number => {
  try {
    const json = JSON.stringify(value);
    return new TextEncoder().encode(json).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
};

export const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "n/a";

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
  }

  return `${(bytes / 1024).toFixed(0)} КБ`;
};
