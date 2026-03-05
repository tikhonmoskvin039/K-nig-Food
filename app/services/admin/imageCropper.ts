import type { Area } from "react-easy-crop";

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Не удалось загрузить изображение для кадрирования")),
    );

    image.src = src;
  });
}

export async function cropImageFile(
  file: File,
  croppedAreaPixels: Area | null,
): Promise<Blob> {
  if (!croppedAreaPixels) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const width = Math.max(1, Math.round(croppedAreaPixels.width));
    const height = Math.max(1, Math.round(croppedAreaPixels.height));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Не удалось создать canvas для кадрирования");
    }

    context.drawImage(
      image,
      Math.max(0, Math.round(croppedAreaPixels.x)),
      Math.max(0, Math.round(croppedAreaPixels.y)),
      width,
      height,
      0,
      0,
      width,
      height,
    );

    const mimeType = file.type || "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mimeType, 0.92),
    );

    if (!blob) {
      throw new Error("Не удалось получить итоговый файл после кадрирования");
    }

    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
