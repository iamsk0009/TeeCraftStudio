// hooks/useSvgUrl.js
import { useEffect, useRef, useState } from "react";
import { svgStore } from "../../utils/svgStore";

export function useSvgUrl(src, fill, stroke, wantInline = false) {
  const [dataUrl, setDataUrl] = useState(null);
  const [inline, setInline] = useState(wantInline ? "" : null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!src) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    svgStore
      .getTransformed(
        src,
        { fill, stroke, includeInline: wantInline },
        controller.signal
      )
      .then(({ dataUrl, inline }) => {
        setDataUrl(dataUrl);
        if (wantInline) setInline(inline);
      })
      .catch((e) => {
        if (e.name !== "AbortError") console.error("SVG transform failed:", e);
      });

    return () => controller.abort();
  }, [src, fill, stroke, wantInline]);

  return { dataUrl, inline };
}
