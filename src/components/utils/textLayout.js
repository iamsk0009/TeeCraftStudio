let measurementCanvas = null;
let measurementContext = null;

const getMeasurementContext = () => {
  if (typeof document === "undefined") return null;
  if (measurementContext) return measurementContext;
  measurementCanvas = document.createElement("canvas");
  measurementContext = measurementCanvas.getContext("2d");
  return measurementContext;
};

const buildFontString = ({ fontStyle = "normal", fontWeight = "normal", fontFamily = "Arial", fontSize = 24 }) =>
  `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

const measureLineWidth = (ctx, text, fontSpec, letterSpacing) => {
  const safeText = text ?? "";
  const spacing = letterSpacing && safeText.length > 1 ? (safeText.length - 1) * letterSpacing : 0;

  if (!ctx) {
    // Fallback for non-browser environments
    return Math.max(0, safeText.length * fontSpec.fontSize + spacing);
  }

  ctx.font = buildFontString(fontSpec);
  const metrics = ctx.measureText(safeText || " ");
  return Math.max(0, (metrics?.width || 0) + spacing);
};

const breakLongWord = (ctx, word, targetWidth, fontSpec, letterSpacing, output) => {
  if (!word) {
    output.push("");
    return;
  }
  let current = "";
  for (const char of word.split("")) {
    const candidate = current + char;
    const width = measureLineWidth(ctx, candidate, fontSpec, letterSpacing);
    if (width <= targetWidth || !current) {
      current = candidate;
    } else {
      output.push(current);
      current = char;
    }
  }
  if (current) output.push(current);
};

const wrapParagraph = (ctx, paragraph, targetWidth, fontSpec, letterSpacing) => {
  const words = paragraph.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [""];

  const lines = [];
  let currentLine = "";

  const pushCurrent = () => {
    lines.push(currentLine);
    currentLine = "";
  };

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const width = measureLineWidth(ctx, candidate, fontSpec, letterSpacing);

    if (width <= targetWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) pushCurrent();
      const wordWidth = measureLineWidth(ctx, word, fontSpec, letterSpacing);
      if (wordWidth <= targetWidth) {
        currentLine = word;
      } else {
        breakLongWord(ctx, word, targetWidth, fontSpec, letterSpacing, lines);
        currentLine = "";
      }
    }
  });

  if (currentLine) pushCurrent();

  return lines.length > 0 ? lines : [""];
};

const clampLinesToHeight = (lines, fontSize, lineHeight, targetHeight) => {
  const maxLines = Math.max(1, Math.floor(targetHeight / Math.max(1, fontSize * lineHeight)));
  if (lines.length <= maxLines) {
    return {
      lines,
      contentHeight: lines.length * fontSize * lineHeight,
    };
  }
  const sliced = lines.slice(0, maxLines);
  return {
    lines: sliced,
    contentHeight: sliced.length * fontSize * lineHeight,
  };
};

export const layoutText = ({
  text = "",
  width = 0,
  height = 0,
  fontSize = 24,
  minFontSize = 12,
  fontFamily = "Arial",
  fontWeight = "normal",
  fontStyle = "normal",
  lineHeight = 1.2,
  letterSpacing = 0,
} = {}) => {
  const ctx = getMeasurementContext();
  const safeWidth = Math.max(1, width || 0);
  const safeHeight = Math.max(1, height || 0);
  const safeMin = Math.max(1, minFontSize || 1);
  const normalizedText = String(text ?? "").replace(/\r\n/g, "\n");
  const baseLines = normalizedText.length > 0 ? normalizedText.split("\n") : [""];

  const fontSpec = {
    fontFamily,
    fontWeight,
    fontStyle,
    fontSize,
  };

  const fitsWithoutWrap = (size) => {
    const spec = { ...fontSpec, fontSize: size };
    const maxWidth = baseLines.reduce(
      (acc, line) => Math.max(acc, measureLineWidth(ctx, line, spec, letterSpacing)),
      0
    );
    const totalHeight = baseLines.length * size * lineHeight;
    return {
      fitsWidth: maxWidth <= safeWidth + 0.5,
      fitsHeight: totalHeight <= safeHeight + 0.5,
      maxWidth,
      totalHeight,
    };
  };

  let currentSize = fontSize || safeMin;
  while (currentSize > safeMin) {
    const { fitsWidth, fitsHeight } = fitsWithoutWrap(currentSize);
    if (fitsWidth && fitsHeight) {
      const spec = { ...fontSpec, fontSize: currentSize };
      const lineWidths = baseLines.map((line) => measureLineWidth(ctx, line, spec, letterSpacing));
      return {
        fontSize: currentSize,
        lines: baseLines,
        lineWidths,
        contentHeight: baseLines.length * currentSize * lineHeight,
        wrapped: false,
      };
    }
    currentSize -= 1;
  }

  // Evaluate at minimum size without wrapping
  const minSpec = { ...fontSpec, fontSize: safeMin };
  const minCheck = fitsWithoutWrap(safeMin);
  if (minCheck.fitsWidth && minCheck.fitsHeight) {
    const lineWidths = baseLines.map((line) => measureLineWidth(ctx, line, minSpec, letterSpacing));
    return {
      fontSize: safeMin,
      lines: baseLines,
      lineWidths,
      contentHeight: baseLines.length * safeMin * lineHeight,
      wrapped: false,
    };
  }

  // Wrap at minimum font size
  const wrappedLines = baseLines.flatMap((line) =>
    wrapParagraph(ctx, line, safeWidth, minSpec, letterSpacing)
  );

  const { lines: clippedLines, contentHeight } = clampLinesToHeight(
    wrappedLines,
    safeMin,
    lineHeight,
    safeHeight
  );

  const wrappedLineWidths = clippedLines.map((line) =>
    measureLineWidth(ctx, line, minSpec, letterSpacing)
  );

  return {
    fontSize: safeMin,
    lines: clippedLines.length > 0 ? clippedLines : [""],
    lineWidths: wrappedLineWidths,
    contentHeight,
    wrapped: true,
  };
};

