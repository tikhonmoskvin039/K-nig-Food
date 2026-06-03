"use client";

import { useEffect, useRef, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import {
  getVideoMimeTypeFromUrl,
  isVideoMediaUrl,
} from "../../utils/productMedia";
import ProductMedia from "./ProductMedia";

interface ProductLightboxProps {
  images: string[];
}

const LIGHTBOX_WHEEL_ZOOM_DISTANCE_FACTOR = 260;
const LIGHTBOX_ZOOM_IN_MULTIPLIER = 1.35;

export default function ProductLightbox({ images }: ProductLightboxProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const galleryScrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!lightboxOpen) {
      document.body.style.overflow = "";
    }
  }, [lightboxOpen]);

  if (!images || images.length === 0) return null;

  const hasGallery = images.length > 1;
  const slides = images.map((src) =>
    isVideoMediaUrl(src)
      ? {
          type: "video" as const,
          width: 1280,
          height: 720,
          sources: [
            {
              src,
              type: getVideoMimeTypeFromUrl(src),
            },
          ],
        }
      : { src },
  );

  const scrollGallery = (direction: "previous" | "next") => {
    const scroller = galleryScrollerRef.current;
    if (!scroller) return;

    const distance = Math.max(scroller.clientWidth * 0.78, 120);
    scroller.scrollBy({
      left: direction === "next" ? distance : -distance,
      behavior: "smooth",
    });
  };

  const galleryArrowClass =
    "inline-flex h-9 w-9 items-center justify-center border-0 bg-transparent p-0 text-slate-600 transition hover:scale-110 hover:text-amber-700 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500";

  return (
    <div>
      {/* MAIN IMAGE (Click to Open Lightbox) */}
      <div
        className="w-full cursor-pointer"
        onClick={() => {
          setLightboxIndex(0);
          setLightboxOpen(true);
        }}
      >
        <ProductMedia
          src={images[0]}
          alt="Main Product Image"
          width={800}
          height={600}
          className="w-full h-auto object-contain rounded-lg border"
          priority
          unoptimized
          controls={isVideoMediaUrl(images[0])}
        />
      </div>

      {/* IMAGE GALLERY (Below Main Image) */}
      {hasGallery && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                ГАЛЕРЕЯ
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {images.length} элемента
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className={galleryArrowClass}
                aria-label="Предыдущие фото и видео"
                onClick={() => scrollGallery("previous")}
              >
                <IoChevronBack size={28} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={galleryArrowClass}
                aria-label="Следующие фото и видео"
                onClick={() => scrollGallery("next")}
              >
                <IoChevronForward size={28} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            ref={galleryScrollerRef}
            className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 scroll-smooth sm:mx-0 sm:px-0"
          >
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                className="relative h-24 w-24 shrink-0 snap-start cursor-pointer overflow-hidden rounded-md border border-slate-200 bg-slate-50 transition hover:border-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 sm:h-28 sm:w-28"
                onClick={() => {
                  setLightboxIndex(index);
                  setLightboxOpen(true);
                }}
              >
                <ProductMedia
                  src={image}
                  alt={`Gallery image ${index + 1}`}
                  width={112}
                  height={112}
                  className="h-full w-full object-contain"
                  unoptimized
                  autoPlay={false}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxOpen && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={slides}
          plugins={[Video, Zoom]}
          animation={{
            zoom: 260,
          }}
          zoom={{
            scrollToZoom: true,
            pinchZoomV4: true,
            maxZoomPixelRatio: 4,
            wheelZoomDistanceFactor: LIGHTBOX_WHEEL_ZOOM_DISTANCE_FACTOR,
            zoomInMultiplier: LIGHTBOX_ZOOM_IN_MULTIPLIER,
          }}
          controller={{
            closeOnPullDown: false,
            closeOnPullUp: false,
          }}
        />
      )}
    </div>
  );
}
