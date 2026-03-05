"use client";

import { useEffect, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import type { CropPixels } from "../../services/admin/imageCropper";
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

type Props = {
  open: boolean;
  imageUrl: string;
  fileName: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: (result: {
    croppedAreaPixels: CropPixels | null;
    preset: CropAspectPreset;
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

function toCropPixels(crop: PixelCrop | null): CropPixels | null {
  if (!crop) return null;
  if (crop.width <= 0 || crop.height <= 0) return null;

  return {
    x: crop.x,
    y: crop.y,
    width: crop.width,
    height: crop.height,
  };
}

export default function ImageCropperModal({
  open,
  imageUrl,
  fileName,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: Props) {
  const [preset, setPreset] = useState<CropAspectPreset>("square");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  const activeAspect =
    preset === "free" ? undefined : PRESET_ASPECTS[preset];

  const applyCropForPreset = (
    nextPreset: CropAspectPreset,
    size: { width: number; height: number } | null,
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
              Кадрирование изображения
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
            {preset === "free"
              ? "Свободный режим: тяните стороны/углы рамки для изменения пропорций."
              : "Рамка фиксирует выбранные пропорции. Можно двигать и масштабировать её углами."}
          </p>

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Кадрирование"
                className="max-h-[70vh] w-auto max-w-full object-contain select-none touch-none"
                onLoad={(event) => {
                  const target = event.currentTarget;
                  const size = {
                    width: target.naturalWidth,
                    height: target.naturalHeight,
                  };
                  setImageSize(size);
                  applyCropForPreset(preset, size);
                  setCompletedCrop(null);
                }}
              />
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
                croppedAreaPixels: toCropPixels(completedCrop),
                preset,
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
