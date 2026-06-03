"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { isVideoMediaUrl } from "../../utils/productMedia";

type Props = {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  priority?: boolean;
  unoptimized?: boolean;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
};

export default function ProductMedia({
  src,
  alt,
  fill = false,
  width,
  height,
  sizes,
  className = "",
  priority = false,
  unoptimized = false,
  controls = false,
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
}: Props) {
  const safeSrc = src || "/placeholder.png";
  const isVideo = isVideoMediaUrl(safeSrc);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isVideo || controls) return;

    const video = videoRef.current;
    if (!video) return;

    if (autoPlay) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [autoPlay, controls, isVideo, safeSrc]);

  if (isVideo) {
    return (
      <video
        ref={videoRef}
        src={safeSrc}
        className={fill ? `absolute inset-0 h-full w-full ${className}` : className}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        controls={controls}
        autoPlay={!controls && autoPlay}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        preload="metadata"
        aria-label={alt}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={safeSrc}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        priority={priority}
        unoptimized={unoptimized}
      />
    );
  }

  return (
    <Image
      src={safeSrc}
      alt={alt}
      width={width || 96}
      height={height || 96}
      className={className}
      priority={priority}
      unoptimized={unoptimized}
    />
  );
}
