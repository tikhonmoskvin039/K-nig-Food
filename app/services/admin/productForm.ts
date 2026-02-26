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

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
