"use client";

import Link from "next/link";
import {
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import ProductMedia from "./ProductMedia";

const SWIPE_THRESHOLD_PX = 42;
const HORIZONTAL_INTENT_RATIO = 1.15;

type ProductCardMediaCarouselProps = {
  product: Pick<
    DTProduct,
    "Slug" | "Title" | "FeatureImageURL" | "ProductImageGallery"
  >;
  sizes: string;
  className?: string;
  mediaClassName?: string;
  arrowSize?: number;
};

function getProductMediaUrls(
  product: ProductCardMediaCarouselProps["product"],
) {
  const urls = [
    product.FeatureImageURL,
    ...(product.ProductImageGallery || []),
  ]
    .map((url) => url?.trim())
    .filter((url): url is string => Boolean(url));

  const uniqueUrls = Array.from(new Set(urls));
  return uniqueUrls.length > 0 ? uniqueUrls : ["/placeholder.png"];
}

export default function ProductCardMediaCarousel({
  product,
  sizes,
  className = "",
  mediaClassName = "",
  arrowSize = 34,
}: ProductCardMediaCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressNavigationRef = useRef(false);
  const mediaUrls = useMemo(
    () => getProductMediaUrls(product),
    [product],
  );
  const mediaCount = mediaUrls.length;
  const safeActiveIndex = Math.min(activeIndex, mediaCount - 1);
  const canSlide = mediaCount > 1;
  const productHref = `/product/${product.Slug}`;

  const suppressNavigationBriefly = () => {
    suppressNavigationRef.current = true;
    window.setTimeout(() => {
      suppressNavigationRef.current = false;
    }, 160);
  };

  const showPrevious = () => {
    if (!canSlide) return;

    setActiveIndex((currentIndex) => {
      const safeIndex = Math.min(currentIndex, mediaCount - 1);
      return safeIndex <= 0 ? mediaCount - 1 : safeIndex - 1;
    });
  };

  const showNext = () => {
    if (!canSlide) return;

    setActiveIndex((currentIndex) => {
      const safeIndex = Math.min(currentIndex, mediaCount - 1);
      return (safeIndex + 1) % mediaCount;
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!canSlide || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;

    const deltaX = event.clientX - pointerStartRef.current.x;
    const deltaY = event.clientY - pointerStartRef.current.y;
    pointerStartRef.current = null;

    if (
      Math.abs(deltaX) < SWIPE_THRESHOLD_PX ||
      Math.abs(deltaX) < Math.abs(deltaY) * HORIZONTAL_INTENT_RATIO
    ) {
      return;
    }

    event.preventDefault();
    suppressNavigationBriefly();

    if (deltaX < 0) {
      showNext();
    } else {
      showPrevious();
    }
  };

  const handlePointerCancel = () => {
    pointerStartRef.current = null;
  };

  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!suppressNavigationRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    suppressNavigationRef.current = false;
  };

  const handleArrowClick = (
    event: MouseEvent<HTMLButtonElement>,
    direction: "previous" | "next",
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (direction === "previous") {
      showPrevious();
    } else {
      showNext();
    }
  };

  const arrowButtonClass =
    "absolute top-1/2 z-20 inline-flex h-11 w-9 -translate-y-1/2 appearance-none items-center justify-center border-0 bg-transparent p-0 text-white drop-shadow-[0_2px_8px_rgba(15,23,42,0.85)] transition hover:scale-110 hover:text-amber-100 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300";

  return (
    <div
      className={`relative h-full w-full select-none overflow-hidden ${className}`}
      style={{ touchAction: canSlide ? "pan-y" : "auto" }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div
        className="flex h-full w-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${safeActiveIndex * 100}%)` }}
      >
        {mediaUrls.map((mediaUrl, index) => (
          <Link
            key={`${mediaUrl}-${index}`}
            href={productHref}
            className="relative block h-full w-full shrink-0 overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
            aria-label={`Открыть ${product.Title}`}
            draggable={false}
            onClick={handleLinkClick}
            onDragStart={(event) => event.preventDefault()}
          >
            <ProductMedia
              src={mediaUrl}
              alt={product.Title}
              fill
              sizes={sizes}
              className={mediaClassName}
              autoPlay={index === safeActiveIndex}
            />
          </Link>
        ))}
      </div>

      {canSlide && (
        <>
          <button
            type="button"
            className={`${arrowButtonClass} left-1 md:left-2`}
            aria-label={`Предыдущее медиа ${product.Title}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => handleArrowClick(event, "previous")}
          >
            <IoChevronBack size={arrowSize} aria-hidden="true" />
          </button>

          <button
            type="button"
            className={`${arrowButtonClass} right-1 md:right-2`}
            aria-label={`Следующее медиа ${product.Title}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => handleArrowClick(event, "next")}
          >
            <IoChevronForward size={arrowSize} aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
