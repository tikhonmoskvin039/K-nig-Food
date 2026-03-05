"use client";

import { useEffect, useMemo, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area, MediaSize, Point } from "react-easy-crop";
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
    croppedAreaPixels: Area | null;
    preset: CropAspectPreset;
  }) => void;
};

export default function ImageCropperModal({
  open,
  imageUrl,
  fileName,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [preset, setPreset] = useState<CropAspectPreset>("square");
  const [naturalAspect, setNaturalAspect] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const activeAspect = useMemo(() => {
    if (preset === "portrait") return 3 / 4;
    if (preset === "landscape") return 16 / 9;
    if (preset === "free") return naturalAspect || 1;
    return 1;
  }, [naturalAspect, preset]);

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
                onClick={() => setPreset(option.id)}
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

          <div className="relative h-[320px] sm:h-[420px] rounded-xl overflow-hidden border bg-slate-900/10">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={activeAspect}
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, nextPixels) => setCroppedAreaPixels(nextPixels)}
              onMediaLoaded={(mediaSize: MediaSize) => {
                const ratio =
                  mediaSize.naturalWidth && mediaSize.naturalHeight
                    ? mediaSize.naturalWidth / mediaSize.naturalHeight
                    : 1;
                setNaturalAspect(ratio || 1);
              }}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs sm:text-sm text-slate-600">Масштаб</p>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-amber-600"
              disabled={isSubmitting}
            />
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
            onClick={() => onConfirm({ croppedAreaPixels, preset })}
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
