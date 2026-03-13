"use client";

import { useEffect, useRef } from "react";
import {
  isTouchLikeDevice,
  triggerHapticFeedback,
  type HapticKind,
} from "../utils/haptics";

const CLICKABLE_SELECTOR = [
  "button",
  "a[href]",
  "label[for]",
  "summary",
  "input[type='button']",
  "input[type='submit']",
  "input[type='checkbox']",
  "input[type='radio']",
  "[role='button']",
].join(", ");

function readHapticKind(target: Element | null): HapticKind | null {
  const value = target?.getAttribute("data-haptic");
  if (
    value === "light" ||
    value === "medium" ||
    value === "success" ||
    value === "warning" ||
    value === "error"
  ) {
    return value;
  }

  // Keep haptics opt-in to avoid affecting tap responsiveness.
  return null;
}

export default function HapticTapProvider() {
  const lastTapRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !isTouchLikeDevice()) {
      return;
    }

    const triggerForTarget = (target: Element | null) => {
      if (!target) return;
      if (target.closest("[data-haptic='off']")) {
        return;
      }

      const clickable = target.closest(CLICKABLE_SELECTOR);
      if (!clickable) return;
      if (clickable.hasAttribute("disabled")) return;
      const hapticKind = readHapticKind(clickable);
      if (!hapticKind) return;

      const now = Date.now();
      if (now - lastTapRef.current < 120) return;
      lastTapRef.current = now;

      // Defer haptics outside the input event task to avoid delaying click handling.
      window.setTimeout(() => {
        triggerHapticFeedback(hapticKind);
      }, 0);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      triggerForTarget(target);
    };

    window.addEventListener("pointerup", onPointerUp, { passive: true });

    // Fallback for very old browsers without Pointer Events.
    const supportsPointerEvents =
      typeof window !== "undefined" &&
      "PointerEvent" in window;
    const onTouchEnd = (event: TouchEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      triggerForTarget(target);
    };
    if (!supportsPointerEvents) {
      window.addEventListener("touchend", onTouchEnd, { passive: true });
    }

    return () => {
      window.removeEventListener("pointerup", onPointerUp);
      if (!supportsPointerEvents) {
        window.removeEventListener("touchend", onTouchEnd);
      }
    };
  }, []);

  return null;
}
