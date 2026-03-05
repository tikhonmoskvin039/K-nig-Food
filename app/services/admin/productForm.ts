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
export const MAX_GALLERY_IMAGES = 5;

export const IMAGE_ACCEPT_ATTRIBUTE = "image/*";

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

export const sanitizeImageBaseName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "product";

export const getImageFileExtension = (file: File) => {
  const fileName = file.name.toLowerCase();
  const matchedByName = IMAGE_SUPPORTED_EXTENSIONS.find((extension) =>
    fileName.endsWith(extension),
  );

  if (matchedByName) {
    return matchedByName.replace(".", "");
  }

  const mimeSubtype = file.type.toLowerCase().split("/")[1] || "jpg";
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
  const ext = getImageFileExtension(originalFile);
  const safeSuffix = sanitizeImageBaseName(suffix);
  const fileName = `${baseName}-${safeSuffix}.${ext}`;

  return new File([blob], fileName, {
    type: blob.type || originalFile.type || "image/jpeg",
    lastModified: Date.now(),
  });
};

type UploadImageParams = {
  file: File;
  slug: string;
  type: "feature" | "gallery";
};

export async function uploadImageToAdmin({
  file,
  slug,
  type,
}: UploadImageParams): Promise<string> {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("slug", slug || "product");
  formData.set("type", type);

  const response = await fetch("/api/admin/uploads", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    let message = "Не удалось загрузить изображение";

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
    throw new Error("Сервер вернул пустой путь изображения");
  }

  return data.url;
}
