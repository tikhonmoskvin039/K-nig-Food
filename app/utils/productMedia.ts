export type ProductMediaKind = "image" | "video";

const VIDEO_MEDIA_QUERY_VALUE = "video";

const VIDEO_EXTENSIONS = [
  ".mp4",
  ".m4v",
  ".mov",
  ".webm",
  ".ogv",
  ".ogg",
];

const VIDEO_MIME_BY_EXTENSION: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".ogv": "video/ogg",
  ".ogg": "video/ogg",
};

function getPathname(value: string) {
  try {
    return new URL(value, "http://local").pathname.toLowerCase();
  } catch {
    return value.split("?")[0]?.split("#")[0]?.toLowerCase() || "";
  }
}

export function isVideoMediaUrl(url?: string | null) {
  if (!url) return false;

  try {
    const parsed = new URL(url, "http://local");
    if (parsed.searchParams.get("media") === VIDEO_MEDIA_QUERY_VALUE) {
      return true;
    }
  } catch {
    // Fall back to extension detection.
  }

  const pathname = getPathname(url);
  return VIDEO_EXTENSIONS.some((extension) => pathname.endsWith(extension));
}

export function getProductMediaKind(url?: string | null): ProductMediaKind {
  return isVideoMediaUrl(url) ? "video" : "image";
}

export function getVideoMimeTypeFromUrl(url: string) {
  const pathname = getPathname(url);
  const extension = VIDEO_EXTENSIONS.find((item) => pathname.endsWith(item));
  return extension ? VIDEO_MIME_BY_EXTENSION[extension] : "video/mp4";
}

export function withProductMediaKind(url: string, mediaKind: ProductMediaKind) {
  if (mediaKind !== "video") return url;

  const [withoutHash, hash = ""] = url.split("#", 2);
  const [path, query = ""] = withoutHash.split("?", 2);
  const searchParams = new URLSearchParams(query);
  searchParams.set("media", VIDEO_MEDIA_QUERY_VALUE);
  const nextQuery = searchParams.toString();

  return `${path}${nextQuery ? `?${nextQuery}` : ""}${hash ? `#${hash}` : ""}`;
}
