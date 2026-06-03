import { isOfflineQueuedResponse } from "../../lib/offlineRequestQueue";
import type { ProductMediaKind } from "../../utils/productMedia";

export const slugifyProductTitle = (value: string) => {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  return value
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
};

export const sanitizeNumericString = (value: string) =>
  value.replace(/[^\d]/g, "");

export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_FILE_SIZE_BYTES = 30 * 1024 * 1024;
export const MAX_VIDEO_DURATION_SECONDS = 15;
export const MAX_GALLERY_IMAGES = 5;

export const PRODUCT_MEDIA_ACCEPT_ATTRIBUTE =
  "image/*,video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg";
export const IMAGE_ACCEPT_ATTRIBUTE = PRODUCT_MEDIA_ACCEPT_ATTRIBUTE;

export const IMAGE_SUPPORTED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
  ".heic",
  ".heif",
  ".svg",
];

export const IMAGE_SUPPORTED_FORMATS_LABEL = "JPG, JPEG, PNG, WEBP, AVIF, GIF, BMP, TIFF, HEIC, HEIF, SVG";

export const VIDEO_SUPPORTED_EXTENSIONS = [
  ".mp4",
  ".m4v",
  ".mov",
  ".webm",
  ".ogv",
  ".ogg",
];

export const VIDEO_SUPPORTED_FORMATS_LABEL = "MP4, M4V, MOV, WEBM, OGV, OGG";

function getFileExtension(file: File) {
  return file.name.toLowerCase().match(/\.[^.]+$/)?.[0] || "";
}

export function getProductMediaKindFromFile(
  file: File,
): ProductMediaKind | null {
  const extension = getFileExtension(file);
  const mimeType = file.type.toLowerCase();

  if (
    mimeType.startsWith("image/") ||
    IMAGE_SUPPORTED_EXTENSIONS.includes(extension)
  ) {
    return "image";
  }

  if (
    mimeType.startsWith("video/") ||
    VIDEO_SUPPORTED_EXTENSIONS.includes(extension)
  ) {
    return "video";
  }

  return null;
}

export function getVideoMetadata(file: File) {
  return new Promise<{
    durationSeconds: number;
    width: number;
    height: number;
  }>((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const durationSeconds = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;
      cleanup();

      if (
        !Number.isFinite(durationSeconds) ||
        durationSeconds <= 0 ||
        width <= 0 ||
        height <= 0
      ) {
        reject(new Error("Не удалось прочитать параметры видео"));
        return;
      }

      resolve({ durationSeconds, width, height });
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Не удалось прочитать видеофайл"));
    };
    video.src = objectUrl;
  });
}

export const validateImageFile = (file: File): string | null => {
  const fileName = file.name.toLowerCase();
  const hasSupportedExtension = IMAGE_SUPPORTED_EXTENSIONS.some((extension) =>
    fileName.endsWith(extension),
  );
  const hasImageMimeType = file.type.toLowerCase().startsWith("image/");

  if (!hasSupportedExtension && !hasImageMimeType) {
    return `Файл "${file.name}" должен быть изображением. Поддерживаемые форматы: ${IMAGE_SUPPORTED_FORMATS_LABEL}.`;
  }

  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    return `Файл "${file.name}" больше 5 МБ`;
  }

  return null;
};

export async function validateProductMediaFile(
  file: File,
  _target: "feature" | "gallery",
): Promise<{
  error: string | null;
  mediaKind: ProductMediaKind | null;
  durationSeconds?: number;
}> {
  void _target;

  const mediaKind = getProductMediaKindFromFile(file);

  if (!mediaKind) {
    return {
      error: `Файл "${file.name}" должен быть изображением или видео. Изображения: ${IMAGE_SUPPORTED_FORMATS_LABEL}. Видео: ${VIDEO_SUPPORTED_FORMATS_LABEL}.`,
      mediaKind: null,
    };
  }

  if (mediaKind === "image") {
    return {
      error: validateImageFile(file),
      mediaKind,
    };
  }

  if (file.size > MAX_VIDEO_FILE_SIZE_BYTES) {
    return {
      error: `Видео "${file.name}" больше 30 МБ`,
      mediaKind,
    };
  }

  let metadata: Awaited<ReturnType<typeof getVideoMetadata>>;
  try {
    metadata = await getVideoMetadata(file);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Не удалось проверить видео",
      mediaKind,
    };
  }

  if (metadata.durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
    return {
      error: `Видео "${file.name}" длиннее ${MAX_VIDEO_DURATION_SECONDS} секунд`,
      mediaKind,
      durationSeconds: metadata.durationSeconds,
    };
  }

  return {
    error: null,
    mediaKind,
    durationSeconds: metadata.durationSeconds,
  };
}

export const sanitizeImageBaseName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "product";

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
  "video/ogg": "ogv",
};

export const getImageFileExtension = (file: File, mimeType = file.type) => {
  const normalizedMimeType = mimeType.toLowerCase().split(";")[0];
  const matchedByMime = MIME_EXTENSION_MAP[normalizedMimeType];

  if (matchedByMime) {
    return matchedByMime;
  }

  const fileName = file.name.toLowerCase();
  const matchedByName = [
    ...IMAGE_SUPPORTED_EXTENSIONS,
    ...VIDEO_SUPPORTED_EXTENSIONS,
  ].find((extension) => fileName.endsWith(extension));

  if (matchedByName) {
    return matchedByName.replace(".", "");
  }

  const mimeSubtype = normalizedMimeType.split("/")[1] || "jpg";
  return mimeSubtype.split("+")[0];
};

export const createUploadFileFromBlob = (
  blob: Blob,
  originalFile: File,
  suffix: string,
) => {
  const baseName = sanitizeImageBaseName(
    originalFile.name.replace(/\.[^.]+$/, ""),
  );
  const fileType = blob.type || originalFile.type || "image/jpeg";
  const ext = getImageFileExtension(originalFile, fileType);
  const safeSuffix = sanitizeImageBaseName(suffix);
  const fileName = `${baseName}-${safeSuffix}.${ext}`;

  return new File([blob], fileName, {
    type: fileType,
    lastModified: Date.now(),
  });
};

type UploadImageParams = {
  file: File;
  slug: string;
  type: "feature" | "gallery";
  mediaKind?: ProductMediaKind;
  durationSeconds?: number;
  videoWidth?: number;
  videoHeight?: number;
};

export async function uploadMediaToAdmin({
  file,
  slug,
  type,
  mediaKind,
  durationSeconds,
  videoWidth,
  videoHeight,
}: UploadImageParams): Promise<string> {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("slug", slug || "product");
  formData.set("type", type);
  formData.set("mediaKind", mediaKind || getProductMediaKindFromFile(file) || "image");

  if (typeof durationSeconds === "number") {
    formData.set("durationSeconds", String(durationSeconds));
  }

  if (typeof videoWidth === "number" && typeof videoHeight === "number") {
    formData.set("videoWidth", String(videoWidth));
    formData.set("videoHeight", String(videoHeight));
  }

  const response = await fetch("/api/admin/uploads", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (isOfflineQueuedResponse(response)) {
    const idempotencyKey = response.headers.get("x-idempotency-key");

    await new Promise<void>((resolve) => {
      if (navigator.onLine) {
        resolve();
        return;
      }

      const handleOnline = () => {
        window.removeEventListener("online", handleOnline);
        resolve();
      };

      window.addEventListener("online", handleOnline);
    });

    const retryHeaders = new Headers();
    retryHeaders.set("x-offline-queue", "skip");

    if (idempotencyKey) {
      retryHeaders.set("x-idempotency-key", idempotencyKey);
    }

    const replayResponse = await fetch("/api/admin/uploads", {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: retryHeaders,
    });

    if (!replayResponse.ok) {
      let replayErrorMessage = "Не удалось загрузить медиа после восстановления сети";

      try {
        const replayErrorData = (await replayResponse.json()) as { message?: string };
        if (replayErrorData?.message) {
          replayErrorMessage = replayErrorData.message;
        }
      } catch {
        // noop
      }

      throw new Error(replayErrorMessage);
    }

    const replayData = (await replayResponse.json()) as { url?: string };
    if (!replayData.url) {
      throw new Error("Сервер вернул пустой путь медиа после повторной отправки");
    }

    return replayData.url;
  }

  if (!response.ok) {
    let message = "Не удалось загрузить медиа";

    try {
      const errorData = (await response.json()) as { message?: string };
      if (errorData?.message) {
        message = errorData.message;
      }
    } catch {
      // noop
    }

    throw new Error(message);
  }

  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error("Сервер вернул пустой путь медиа");
  }

  return data.url;
}

export const uploadImageToAdmin = uploadMediaToAdmin;
