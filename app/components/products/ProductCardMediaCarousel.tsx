"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type TransitionEvent,
} from "react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import ProductMedia from "./ProductMedia";

const SWIPE_THRESHOLD_PX = 42;
const HORIZONTAL_INTENT_RATIO = 1.15;
const DOTS_HIDE_DELAY_MS = 1200;

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
  const [trackIndex, setTrackIndex] = useState(1);
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);
  const [dotsVisible, setDotsVisible] = useState(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressNavigationRef = useRef(false);
  const dotsHideTimeoutRef = useRef<number | null>(null);
  const transitionResetFrameRef = useRef<number | null>(null);
  const secondTransitionResetFrameRef = useRef<number | null>(null);
  const pendingActiveIndexRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const mediaUrls = useMemo(
    () => getProductMediaUrls(product),
    [product],
  );
  const mediaCount = mediaUrls.length;
  const safeActiveIndex = Math.min(activeIndex, mediaCount - 1);
  const canSlide = mediaCount > 1;
  const productHref = `/product/${product.Slug}`;
  const carouselSlides = canSlide
    ? [
        {
          src: mediaUrls[mediaCount - 1],
          key: `clone-last-${mediaUrls[mediaCount - 1]}`,
        },
        ...mediaUrls.map((src, index) => ({
          src,
          key: `media-${src}-${index}`,
        })),
        {
          src: mediaUrls[0],
          key: `clone-first-${mediaUrls[0]}`,
        },
      ]
    : [
        {
          src: mediaUrls[0],
          key: `media-${mediaUrls[0]}-0`,
        },
      ];
  const visibleTrackIndex = canSlide ? trackIndex : 0;

  useEffect(
    () => () => {
      if (dotsHideTimeoutRef.current !== null) {
        window.clearTimeout(dotsHideTimeoutRef.current);
      }

      if (transitionResetFrameRef.current !== null) {
        window.cancelAnimationFrame(transitionResetFrameRef.current);
      }

      if (secondTransitionResetFrameRef.current !== null) {
        window.cancelAnimationFrame(secondTransitionResetFrameRef.current);
      }
    },
    [],
  );

  const suppressNavigationBriefly = () => {
    suppressNavigationRef.current = true;
    window.setTimeout(() => {
      suppressNavigationRef.current = false;
    }, 160);
  };

  const showDotsTemporarily = () => {
    if (!canSlide) return;

    setDotsVisible(true);

    if (dotsHideTimeoutRef.current !== null) {
      window.clearTimeout(dotsHideTimeoutRef.current);
    }

    dotsHideTimeoutRef.current = window.setTimeout(() => {
      setDotsVisible(false);
      dotsHideTimeoutRef.current = null;
    }, DOTS_HIDE_DELAY_MS);
  };

  const showPrevious = () => {
    if (!canSlide || isAnimatingRef.current) return;

    const nextActiveIndex =
      safeActiveIndex <= 0 ? mediaCount - 1 : safeActiveIndex - 1;

    pendingActiveIndexRef.current = nextActiveIndex;
    isAnimatingRef.current = true;
    setIsTransitionEnabled(true);
    setActiveIndex(nextActiveIndex);
    setTrackIndex(safeActiveIndex);
    showDotsTemporarily();
  };

  const showNext = () => {
    if (!canSlide || isAnimatingRef.current) return;

    const nextActiveIndex = (safeActiveIndex + 1) % mediaCount;

    pendingActiveIndexRef.current = nextActiveIndex;
    isAnimatingRef.current = true;
    setIsTransitionEnabled(true);
    setActiveIndex(nextActiveIndex);
    setTrackIndex(safeActiveIndex + 2);
    showDotsTemporarily();
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

  const handleTrackTransitionEnd = (
    event: TransitionEvent<HTMLDivElement>,
  ) => {
    if (!canSlide || event.target !== event.currentTarget) return;

    const pendingActiveIndex = pendingActiveIndexRef.current;
    if (pendingActiveIndex === null) return;

    const resetTrackIndex =
      trackIndex === 0
        ? mediaCount
        : trackIndex === mediaCount + 1
          ? 1
          : null;

    pendingActiveIndexRef.current = null;

    if (resetTrackIndex === null) {
      isAnimatingRef.current = false;
      return;
    }

    setIsTransitionEnabled(false);
    setTrackIndex(resetTrackIndex);

    if (transitionResetFrameRef.current !== null) {
      window.cancelAnimationFrame(transitionResetFrameRef.current);
    }

    if (secondTransitionResetFrameRef.current !== null) {
      window.cancelAnimationFrame(secondTransitionResetFrameRef.current);
    }

    transitionResetFrameRef.current = window.requestAnimationFrame(() => {
      secondTransitionResetFrameRef.current = window.requestAnimationFrame(() => {
        setIsTransitionEnabled(true);
        isAnimatingRef.current = false;
        transitionResetFrameRef.current = null;
        secondTransitionResetFrameRef.current = null;
      });
    });
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
        className={`flex h-full w-full ${
          isTransitionEnabled ? "transition-transform duration-300 ease-out" : ""
        }`}
        style={{ transform: `translateX(-${visibleTrackIndex * 100}%)` }}
        onTransitionEnd={handleTrackTransitionEnd}
      >
        {carouselSlides.map((slide, index) => (
          <Link
            key={slide.key}
            href={productHref}
            className="relative block h-full w-full shrink-0 overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
            aria-label={`Открыть ${product.Title}`}
            draggable={false}
            onClick={handleLinkClick}
            onDragStart={(event) => event.preventDefault()}
          >
            <ProductMedia
              src={slide.src}
              alt={product.Title}
              fill
              sizes={sizes}
              className={mediaClassName}
              autoPlay={index === visibleTrackIndex}
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

      {canSlide && (
        <div
          className={`absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 transition-opacity duration-300 ${
            dotsVisible ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden="true"
        >
          {mediaUrls.map((mediaUrl, index) => (
            <span
              key={`dot-${mediaUrl}-${index}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === safeActiveIndex
                  ? "w-4 bg-white shadow-[0_1px_5px_rgba(15,23,42,0.65)]"
                  : "w-1.5 bg-white/65"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
