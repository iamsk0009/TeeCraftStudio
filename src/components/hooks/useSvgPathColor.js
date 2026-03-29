// hooks/useSvgPathColor.js
// Hook for category img_cat_1766324638637 - colorizes only path fills

import { useEffect, useRef, useState } from "react";
import { svgPathColorizer } from "../../utils/svgPathColorizer";

export function useSvgPathColor(src, color) {
  const [dataUrl, setDataUrl] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!src || !color) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    svgPathColorizer
      .colorizePathFills(src, color, controller.signal)
      .then((url) => {
        if (url) setDataUrl(url);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          console.error("SVG path colorization failed:", e);
        }
      });

    return () => controller.abort();
  }, [src, color]);

  return dataUrl;
}
