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

function readHapticKind(target: Element | null): HapticKind {
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

  if (target?.classList.contains("btn-danger")) {
    return "warning";
  }

  if (target?.classList.contains("btn-primary")) {
    return "medium";
  }

  return "light";
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

      const now = Date.now();
      if (now - lastTapRef.current < 120) return;
      lastTapRef.current = now;

      triggerHapticFeedback(readHapticKind(clickable));
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      triggerForTarget(target);
    };

    const onTouchEnd = (event: TouchEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      triggerForTarget(target);
    };

    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return null;
}
