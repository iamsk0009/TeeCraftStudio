export const measureTextDimensions = ({
  text = "A",
  fontSize = 24,
  fontFamily = "Arial",
  fontWeight = "normal",
  fontStyle = "normal",
  lineHeight = 1.2,
  letterSpacing = 0,
} = {}) => {
  if (typeof document === "undefined") {
    const fallbackHeight = typeof lineHeight === "number" ? lineHeight * fontSize : fontSize * 1.2;
    return {
      width: fontSize,
      height: fallbackHeight,
    };
  }

  const el = document.createElement("span");
  el.style.position = "absolute";
  el.style.visibility = "hidden";
  el.style.whiteSpace = "pre";
  el.style.pointerEvents = "none";
  el.style.fontSize = `${fontSize}px`;
  el.style.fontFamily = fontFamily;
  el.style.fontWeight = fontWeight;
  el.style.fontStyle = fontStyle;
  el.style.lineHeight = typeof lineHeight === "number" ? String(lineHeight) : lineHeight;
  el.style.letterSpacing = `${letterSpacing}px`;
  el.textContent = text || "A";
  document.body.appendChild(el);
  const rect = el.getBoundingClientRect();
  document.body.removeChild(el);

  return {
    width: Math.max(1, rect.width || fontSize),
    height: Math.max(1, rect.height || fontSize),
  };
};

