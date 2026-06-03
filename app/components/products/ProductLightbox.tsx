"use client";

import { useEffect, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
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

  useEffect(() => {
    if (!lightboxOpen) {
      document.body.style.overflow = "";
    }
  }, [lightboxOpen]);

  if (!images || images.length === 0) return null;

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
      <div className="flex gap-2 mt-4 flex-wrap">
        {images.slice(1).map((image, index) => (
          <div
            key={index}
            className="relative w-24 h-24 cursor-pointer border rounded-md overflow-hidden"
            onClick={() => {
              setLightboxIndex(index + 1);
              setLightboxOpen(true);
            }}
          >
            <ProductMedia
              src={image}
              alt={`Gallery image ${index + 1}`}
              width={96}
              height={96}
              className="object-contain w-full h-full"
              unoptimized
            />
          </div>
        ))}
      </div>

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
