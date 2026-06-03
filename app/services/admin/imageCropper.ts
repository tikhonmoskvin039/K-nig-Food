export type CropPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MAX_VIDEO_CROP_DURATION_SECONDS = 15;
const VIDEO_RECORDER_MIME_TYPES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

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

function loadVideo(src: string) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement("video");

    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.addEventListener("loadeddata", () => resolve(video), { once: true });
    video.addEventListener(
      "error",
      () => reject(new Error("Не удалось загрузить видео для кадрирования")),
      { once: true },
    );

    video.src = src;
    video.load();
  });
}

function getSupportedVideoRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  return (
    VIDEO_RECORDER_MIME_TYPES.find((mimeType) =>
      MediaRecorder.isTypeSupported(mimeType),
    ) || ""
  );
}

function normalizeCropPixels(
  crop: CropPixels,
  naturalWidth: number,
  naturalHeight: number,
): CropPixels {
  const x = Math.min(
    Math.max(0, Math.round(crop.x)),
    Math.max(naturalWidth - 1, 0),
  );
  const y = Math.min(
    Math.max(0, Math.round(crop.y)),
    Math.max(naturalHeight - 1, 0),
  );
  const width = Math.max(
    1,
    Math.min(Math.round(crop.width), naturalWidth - x),
  );
  const height = Math.max(
    1,
    Math.min(Math.round(crop.height), naturalHeight - y),
  );

  return { x, y, width, height };
}

export async function cropImageFile(
  file: File,
  croppedAreaPixels: CropPixels | null,
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

export async function cropVideoFile(
  file: File,
  croppedAreaPixels: CropPixels | null,
): Promise<Blob> {
  if (!croppedAreaPixels) {
    return file;
  }

  if (
    typeof MediaRecorder === "undefined" ||
    typeof HTMLCanvasElement === "undefined" ||
    !HTMLCanvasElement.prototype.captureStream
  ) {
    throw new Error("Браузер не поддерживает кадрирование видео");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const video = await loadVideo(objectUrl);
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;

    if (sourceWidth <= 0 || sourceHeight <= 0) {
      throw new Error("Не удалось определить размер видео");
    }

    const crop = normalizeCropPixels(
      croppedAreaPixels,
      sourceWidth,
      sourceHeight,
    );
    const canvas = document.createElement("canvas");
    canvas.width = crop.width;
    canvas.height = crop.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Не удалось создать canvas для кадрирования видео");
    }

    const stream = canvas.captureStream(30);
    const mimeType = getSupportedVideoRecorderMimeType();
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    const chunks: BlobPart[] = [];
    let animationFrameId: number | null = null;
    let stopTimerId: number | null = null;

    const cleanupRecording = () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      if (stopTimerId !== null) {
        window.clearTimeout(stopTimerId);
        stopTimerId = null;
      }

      stream.getTracks().forEach((track) => track.stop());
      video.pause();
    };

    const recording = new Promise<Blob>((resolve, reject) => {
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      });
      recorder.addEventListener(
        "stop",
        () => {
          cleanupRecording();

          if (chunks.length === 0) {
            reject(new Error("Не удалось получить итоговое видео"));
            return;
          }

          resolve(
            new Blob(chunks, {
              type: recorder.mimeType || mimeType || "video/webm",
            }),
          );
        },
        { once: true },
      );
      recorder.addEventListener(
        "error",
        () => {
          cleanupRecording();
          reject(new Error("Не удалось записать обрезанное видео"));
        },
        { once: true },
      );
    });

    const stopRecording = () => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    };

    const drawFrame = () => {
      context.drawImage(
        video,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height,
      );

      if (!video.ended && recorder.state !== "inactive") {
        animationFrameId = window.requestAnimationFrame(drawFrame);
      }
    };

    video.currentTime = 0;
    context.drawImage(
      video,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height,
    );

    recorder.start(100);
    drawFrame();

    const maxDurationMs =
      Math.min(video.duration || MAX_VIDEO_CROP_DURATION_SECONDS, MAX_VIDEO_CROP_DURATION_SECONDS) *
        1000 +
      250;

    video.addEventListener("ended", stopRecording, { once: true });
    stopTimerId = window.setTimeout(stopRecording, maxDurationMs);

    let playError: Error | null = null;

    try {
      await video.play();
    } catch {
      stopRecording();
      playError = new Error("Не удалось запустить видео для кадрирования");
    }

    if (playError) {
      await recording.catch(() => undefined);
      throw playError;
    }

    return await recording;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function cropMediaFile(
  file: File,
  croppedAreaPixels: CropPixels | null,
): Promise<Blob> {
  const fileName = file.name.toLowerCase();
  const looksLikeVideo =
    file.type.toLowerCase().startsWith("video/") ||
    [".mp4", ".m4v", ".mov", ".webm", ".ogv", ".ogg"].some((extension) =>
      fileName.endsWith(extension),
    );

  if (looksLikeVideo) {
    return cropVideoFile(file, croppedAreaPixels);
  }

  return cropImageFile(file, croppedAreaPixels);
}
