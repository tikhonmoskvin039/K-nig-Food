"use client";

import { useEffect, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import type { CropPixels } from "../../services/admin/imageCropper";
import type { ProductMediaKind } from "../../utils/productMedia";
import ButtonSpinner from "../common/ButtonSpinner";

export type CropAspectPreset = "square" | "portrait" | "landscape" | "free";

const CROP_PRESET_OPTIONS: Array<{
  id: CropAspectPreset;
  label: string;
}> = [
  { id: "square", label: "Квадрат 1:1" },
  { id: "portrait", label: "3:4" },
  { id: "landscape", label: "16:9" },
  { id: "free", label: "Произвольный" },
];

const MAX_VIDEO_DURATION_SECONDS = 15;

type Props = {
  open: boolean;
  mediaUrl: string;
  mediaKind?: ProductMediaKind;
  fileName: string;
  isSubmitting?: boolean;
  initialPreset?: CropAspectPreset;
  onCancel: () => void;
  onConfirm: (result: {
    croppedAreaPixels: CropPixels | null;
    preset: CropAspectPreset;
    trimStartSeconds?: number;
    trimEndSeconds?: number;
  }) => void;
};

const PRESET_ASPECTS: Record<Exclude<CropAspectPreset, "free">, number> = {
  square: 1,
  portrait: 3 / 4,
  landscape: 16 / 9,
};

function createCenteredAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 84,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

function createDefaultFreeCrop(mediaWidth: number, mediaHeight: number): Crop {
  const width = 84;
  const height = Math.max(
    20,
    Math.min(84, (mediaWidth / mediaHeight) * 44),
  );

  return {
    unit: "%",
    width,
    height,
    x: (100 - width) / 2,
    y: (100 - height) / 2,
  };
}

function toCropPixels(
  crop: PixelCrop | Crop | null | undefined,
  imageSize: {
    naturalWidth: number;
    naturalHeight: number;
    width: number;
    height: number;
  } | null,
): CropPixels | null {
  if (!crop) return null;
  if (crop.width <= 0 || crop.height <= 0) return null;
  if (!imageSize || imageSize.width <= 0 || imageSize.height <= 0) return null;

  if (crop.unit === "%") {
    const x = Math.max(0, Math.round((crop.x / 100) * imageSize.naturalWidth));
    const y = Math.max(0, Math.round((crop.y / 100) * imageSize.naturalHeight));
    const width = Math.max(
      1,
      Math.round((crop.width / 100) * imageSize.naturalWidth),
    );
    const height = Math.max(
      1,
      Math.round((crop.height / 100) * imageSize.naturalHeight),
    );
    const clampedX = Math.min(x, Math.max(imageSize.naturalWidth - 1, 0));
    const clampedY = Math.min(y, Math.max(imageSize.naturalHeight - 1, 0));

    return {
      x: clampedX,
      y: clampedY,
      width: Math.min(width, imageSize.naturalWidth - clampedX),
      height: Math.min(height, imageSize.naturalHeight - clampedY),
    };
  }

  const scaleX = imageSize.naturalWidth / imageSize.width;
  const scaleY = imageSize.naturalHeight / imageSize.height;
  const x = Math.max(0, Math.round(crop.x * scaleX));
  const y = Math.max(0, Math.round(crop.y * scaleY));
  const width = Math.max(1, Math.round(crop.width * scaleX));
  const height = Math.max(1, Math.round(crop.height * scaleY));
  const clampedX = Math.min(x, Math.max(imageSize.naturalWidth - 1, 0));
  const clampedY = Math.min(y, Math.max(imageSize.naturalHeight - 1, 0));

  return {
    x: clampedX,
    y: clampedY,
    width: Math.min(width, imageSize.naturalWidth - clampedX),
    height: Math.min(height, imageSize.naturalHeight - clampedY),
  };
}

function formatSeconds(value: number) {
  if (!Number.isFinite(value)) return "0.0";
  return value.toFixed(1);
}

export default function ImageCropperModal({
  open,
  mediaUrl,
  mediaKind = "image",
  fileName,
  isSubmitting = false,
  initialPreset = "square",
  onCancel,
  onConfirm,
}: Props) {
  const [preset, setPreset] = useState<CropAspectPreset>(initialPreset);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [imageSize, setImageSize] = useState<{
    naturalWidth: number;
    naturalHeight: number;
    width: number;
    height: number;
  } | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStartSeconds, setTrimStartSeconds] = useState(0);
  const [trimEndSeconds, setTrimEndSeconds] = useState(MAX_VIDEO_DURATION_SECONDS);

  const activeAspect =
    preset === "free" ? undefined : PRESET_ASPECTS[preset];
  const safeVideoDuration = Math.max(0, videoDuration);
  const safeTrimStartSeconds = Math.min(
    Math.max(0, trimStartSeconds),
    Math.max(safeVideoDuration - 0.1, 0),
  );
  const safeTrimEndSeconds = Math.min(
    Math.max(safeTrimStartSeconds + 0.1, trimEndSeconds),
    Math.min(
      safeVideoDuration || MAX_VIDEO_DURATION_SECONDS,
      safeTrimStartSeconds + MAX_VIDEO_DURATION_SECONDS,
    ),
  );
  const selectedVideoDuration = Math.max(
    0,
    safeTrimEndSeconds - safeTrimStartSeconds,
  );

  const applyCropForPreset = (
    nextPreset: CropAspectPreset,
    size: {
      naturalWidth: number;
      naturalHeight: number;
      width: number;
      height: number;
    } | null,
  ) => {
    if (!size) return;

    const nextAspect =
      nextPreset === "free" ? undefined : PRESET_ASPECTS[nextPreset];

    setCrop(
      nextAspect
        ? createCenteredAspectCrop(size.width, size.height, nextAspect)
        : createDefaultFreeCrop(size.width, size.height),
    );
  };

  const updateTrimStart = (nextStart: number) => {
    if (!safeVideoDuration) return;

    const maxStart = Math.max(safeVideoDuration - 0.1, 0);
    const clampedStart = Math.min(Math.max(0, nextStart), maxStart);
    const currentEnd = Math.max(trimEndSeconds, clampedStart + 0.1);
    const nextEnd = Math.min(
      Math.max(currentEnd, clampedStart + 0.1),
      Math.min(safeVideoDuration, clampedStart + MAX_VIDEO_DURATION_SECONDS),
    );

    setTrimStartSeconds(clampedStart);
    setTrimEndSeconds(nextEnd);
  };

  const updateTrimEnd = (nextEnd: number) => {
    if (!safeVideoDuration) return;

    const minEnd = safeTrimStartSeconds + 0.1;
    const maxEnd = Math.min(
      safeVideoDuration,
      safeTrimStartSeconds + MAX_VIDEO_DURATION_SECONDS,
    );

    setTrimEndSeconds(Math.min(Math.max(nextEnd, minEnd), maxEnd));
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm p-3 sm:p-6">
      <div className="mx-auto h-full max-w-5xl surface-card flex flex-col overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
              {mediaKind === "video"
                ? "Кадрирование видео"
                : "Кадрирование изображения"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 break-all">
              {fileName}
            </p>
          </div>

          <button
            type="button"
            className="btn-ghost px-3 py-2 min-w-24"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Закрыть
          </button>
        </div>

        <div className="p-4 sm:p-6 flex-1 overflow-auto space-y-4">
          <div className="flex flex-wrap gap-2">
            {CROP_PRESET_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setPreset(option.id);
                  applyCropForPreset(option.id, imageSize);
                }}
                disabled={isSubmitting}
                className={
                  preset === option.id
                    ? "btn-primary px-3 py-2"
                    : "btn-secondary px-3 py-2"
                }
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-600">
            {mediaKind === "video"
              ? "Для главного экрана рекомендуем 16:9. Выберите рамку и фрагмент видео до 15 секунд."
              : preset === "free"
              ? "Свободный режим: тяните стороны/углы рамки для изменения пропорций."
              : "Рамка фиксирует выбранные пропорции. Можно двигать и масштабировать её углами."}
          </p>

          {mediaKind === "video" && safeVideoDuration > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-slate-900">
                  Фрагмент видео
                </p>
                <p className="text-xs text-slate-500">
                  Выбрано {formatSeconds(selectedVideoDuration)} сек. из{" "}
                  {formatSeconds(safeVideoDuration)} сек.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600">
                    Начало, сек.
                  </span>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    max={Math.max(safeVideoDuration - 0.1, 0)}
                    step={0.1}
                    value={formatSeconds(safeTrimStartSeconds)}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      updateTrimStart(Number(event.target.value))
                    }
                  />
                  <input
                    type="range"
                    className="w-full accent-amber-600"
                    min={0}
                    max={Math.max(safeVideoDuration - 0.1, 0)}
                    step={0.1}
                    value={safeTrimStartSeconds}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      updateTrimStart(Number(event.target.value))
                    }
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600">
                    Конец, сек.
                  </span>
                  <input
                    type="number"
                    className="form-control"
                    min={safeTrimStartSeconds + 0.1}
                    max={Math.min(
                      safeVideoDuration,
                      safeTrimStartSeconds + MAX_VIDEO_DURATION_SECONDS,
                    )}
                    step={0.1}
                    value={formatSeconds(safeTrimEndSeconds)}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      updateTrimEnd(Number(event.target.value))
                    }
                  />
                  <input
                    type="range"
                    className="w-full accent-amber-600"
                    min={safeTrimStartSeconds + 0.1}
                    max={Math.min(
                      safeVideoDuration,
                      safeTrimStartSeconds + MAX_VIDEO_DURATION_SECONDS,
                    )}
                    step={0.1}
                    value={safeTrimEndSeconds}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      updateTrimEnd(Number(event.target.value))
                    }
                  />
                </label>
              </div>
            </div>
          )}

          <div className="relative rounded-xl overflow-auto border bg-slate-900/10 p-2">
            <ReactCrop
              crop={crop}
              onChange={(nextCrop) => setCrop(nextCrop)}
              onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
              aspect={activeAspect}
              keepSelection
              ruleOfThirds
              minWidth={40}
              minHeight={40}
            >
              {mediaKind === "video" ? (
                <video
                  src={mediaUrl}
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  className="max-h-[70vh] w-auto max-w-full object-contain select-none touch-none"
                  onLoadedMetadata={(event) => {
                    const target = event.currentTarget;
                    const duration = Number.isFinite(target.duration)
                      ? target.duration
                      : 0;
                    const size = {
                      naturalWidth: target.videoWidth,
                      naturalHeight: target.videoHeight,
                      width: target.clientWidth || target.videoWidth,
                      height: target.clientHeight || target.videoHeight,
                    };
                    setImageSize(size);
                    applyCropForPreset(preset, size);
                    setCompletedCrop(null);
                    setVideoDuration(duration);
                    setTrimStartSeconds(0);
                    setTrimEndSeconds(
                      Math.min(duration || MAX_VIDEO_DURATION_SECONDS, MAX_VIDEO_DURATION_SECONDS),
                    );
                  }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl}
                  alt="Кадрирование"
                  className="max-h-[70vh] w-auto max-w-full object-contain select-none touch-none"
                  onLoad={(event) => {
                    const target = event.currentTarget;
                    const size = {
                      naturalWidth: target.naturalWidth,
                      naturalHeight: target.naturalHeight,
                      width: target.width,
                      height: target.height,
                    };
                    setImageSize(size);
                    applyCropForPreset(preset, size);
                    setCompletedCrop(null);
                  }}
                />
              )}
            </ReactCrop>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 border-t flex flex-col sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary min-w-28"
            disabled={isSubmitting}
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={() =>
              onConfirm({
                croppedAreaPixels: toCropPixels(completedCrop ?? crop, imageSize),
                preset,
                ...(mediaKind === "video"
                  ? {
                      trimStartSeconds: safeTrimStartSeconds,
                      trimEndSeconds: safeTrimEndSeconds,
                    }
                  : {}),
              })
            }
            className="btn-primary min-w-36"
            disabled={isSubmitting}
          >
            {isSubmitting ? <ButtonSpinner /> : "Применить"}
          </button>
        </div>
      </div>
    </div>
  );
}
