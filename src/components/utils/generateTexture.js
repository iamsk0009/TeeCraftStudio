import { TEXTURE_SIZE, MIN_TEXTBOX_FONT_SIZE } from "./constants";
import { layoutText } from "./textLayout";

import { svgStore } from '../../utils/svgStore';

const imageCache = new Map();
const contrastColorCache = new Map();

const canvasSize = TEXTURE_SIZE;

// Helper function to get dynamic container size from SVG element
// Uses the rendered container size for proper coordinate mapping with element positions
const getContainerSize = (svgElement) => {
  if (!svgElement) return { width: 500, height: 500 };
  
  // Get the parent container's rendered dimensions - this matches how elements are positioned
  const container = svgElement.parentElement;
  if (container) {
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { width: rect.width, height: rect.height };
    }
  }
  
  // Fallback to SVG's own rendered dimensions
  const svgRect = svgElement.getBoundingClientRect();
  if (svgRect.width > 0 && svgRect.height > 0) {
    return { width: svgRect.width, height: svgRect.height };
  }
  
  return { width: 500, height: 500 };
};

function getContrastingColor(textColor) {
  if (contrastColorCache.has(textColor)) {
    return contrastColorCache.get(textColor);
  }

  let result = "rgba(255,255,255,0.8)";

  if (textColor[0] === "#" && textColor.length === 7) {
    const hex = parseInt(textColor.slice(1), 16);
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    result = brightness > 128 ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.8)";
  } else if (textColor.startsWith("rgb")) {
    const matches = textColor.match(/\d+/g);
    if (matches?.length >= 3) {
      const brightness =
        (parseInt(matches[0]) * 299 +
          parseInt(matches[1]) * 587 +
          parseInt(matches[2]) * 114) /
        1000;
      result = brightness > 128 ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.8)";
    }
  }

  contrastColorCache.set(textColor, result);
  return result;
}

function getVisibleElements(images, textboxes, layerOrder) {
  const result = [];

  // Ensure layerOrder is an array
  const safeLayerOrder = Array.isArray(layerOrder) ? layerOrder : [];

  if (safeLayerOrder.length === 0) {
    // If no layer order is defined, add all visible elements
    for (const img of images || []) {
      if (img?.onCanvas) result.push({ ...img, type: "image" });
    }
    for (const tb of textboxes || []) {
      if (tb?.onCanvas) result.push({ ...tb, type: "textbox" });
    }
    return result;
  }

  const imgMap = new Map();
  const tbMap = new Map();

  // Ensure images and textboxes are arrays
  for (const img of images || []) {
    if (img?.onCanvas) imgMap.set(img.id, img);
  }
  for (const tb of textboxes || []) {
    if (tb?.onCanvas) tbMap.set(tb.id, tb);
  }

  // Process layer order
  for (const item of safeLayerOrder) {
    if (!item || !item.type || !item.id) continue;

    const element =
      item.type === "image" ? imgMap.get(item.id) : tbMap.get(item.id);
    if (element) {
      result.push({ ...element, type: item.type });
    }
  }

  return result;
}

function processImage(image, ctx, containerSize) {
  return new Promise(resolve => {
    const processSvg = () => {
     // If not SVG, or already have a data URL src, just use it
     if (!image.isSvg) return Promise.resolve(image.src);
     if (image.src && image.src.startsWith('data:image/svg+xml')) {
       return Promise.resolve(image.src);
     }
     // Transform to data URL using originalSrc (fallback to src)
     const src = image.originalSrc || image.src;
     return svgStore
       .getTransformed(src, {
         fill: image.svgColor || '#000000',
         stroke: image.svgStrokeColor || 'none'
       })
       .then(({ dataUrl }) => dataUrl)
       .catch(e => {
         console.error('Error transforming SVG:', e);
         return image.src || src;
       });
    };

    processSvg().then(srcToLoad => {
      const cacheKey = `${srcToLoad}_${image.width}_${image.height}`;

      if (imageCache.has(cacheKey)) {
        drawImage(imageCache.get(cacheKey), image, ctx, containerSize);
        resolve();
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imageCache.set(cacheKey, img);
        if (imageCache.size > 100) {
          const firstKey = imageCache.keys().next().value;
          imageCache.delete(firstKey);
        }
        drawImage(img, image, ctx, containerSize);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = srcToLoad;
    });
  }); // ← This closes the Promise constructor
} // ← This closes the processImage function

function drawImage(img, config, ctx, containerSize) {
  // Scale X and Y separately to map from container to texture coordinates
  const scaleX = canvasSize / containerSize.width;
  const scaleY = canvasSize / containerSize.height;

  // Scale element position and size to texture canvas coordinates
  const imageX = config.x * scaleX;
  const imageY = config.y * scaleY;
  const imageWidth = config.width * scaleX;
  const imageHeight = config.height * scaleY;

  ctx.save();
  ctx.translate(imageX + imageWidth / 2, imageY + imageHeight / 2);

  if (config.rotation) {
    ctx.rotate((config.rotation * Math.PI) / 180);
  }

  ctx.drawImage(
    img,
    -imageWidth / 2,
    -imageHeight / 2,
    imageWidth,
    imageHeight
  );
  ctx.restore();
}

function applyLetterSpacing(ctx, text, x, y, letterSpacingPx) {
  // Canvas has no native letter spacing; draw glyph-by-glyph when spacing != 0
  if (!text || letterSpacingPx === 0) {
    ctx.fillText(text, x, y);
    return;
  }
  let currX = x;
  for (const ch of text) {
    ctx.fillText(ch, currX, y);
    const advance = ctx.measureText(ch).width + letterSpacingPx;
    currX += advance;
  }
}


function processText(textbox, ctx, containerSize) {
  const raw = (textbox.text ?? "").replace(/\r\n/g, "\n");
  if (!raw) return;

  // Scale X and Y separately to map from container to texture coordinates
  const scaleX = canvasSize / containerSize.width;
  const scaleY = canvasSize / containerSize.height;
  // Use average scale for font size to maintain proportions
  const fontScale = (scaleX + scaleY) / 2;
  
  const boxX = textbox.x * scaleX;
  const boxY = textbox.y * scaleY;
  const boxW = Math.max(1, textbox.width * scaleX);
  const boxH = Math.max(1, textbox.height * scaleY);

  const layout = layoutText({
    text: raw,
    width: textbox.width || 0,
    height: textbox.height || 0,
    fontSize: textbox.fontSize || 24,
    minFontSize: textbox.minFontSize || MIN_TEXTBOX_FONT_SIZE,
    fontFamily: textbox.fontFamily || "Arial",
    fontWeight: textbox.fontWeight || "normal",
    fontStyle: textbox.fontStyle || "normal",
    lineHeight: textbox.lineHeight || 1.2,
    letterSpacing: textbox.letterSpacing || 0,
  });

  const lines = layout.lines;
  if (!lines || lines.length === 0) return;

  const appliedFontPx = layout.fontSize * fontScale;
  const lineHeightFactor = textbox.lineHeight || 1.2;
  const lineHeightPx = appliedFontPx * lineHeightFactor;
  const letterSpacingPx = (textbox.letterSpacing || 0) * fontScale;
  const alignmentRaw = (textbox.textAlign || "left").toLowerCase();
  const alignment = ["left", "center", "right"].includes(alignmentRaw) ? alignmentRaw : "left";

  const maxVisibleLines = Math.max(1, Math.floor(boxH / Math.max(1, lineHeightPx)));
  const visibleLines = lines.slice(0, maxVisibleLines);
  const visibleWidths = layout.lineWidths
    ? layout.lineWidths.slice(0, visibleLines.length)
    : visibleLines.map(() => 0);

  ctx.save();
  const cx = boxX + boxW / 2;
  const cy = boxY + boxH / 2;
  ctx.translate(cx, cy);
  if (textbox.rotation) {
    ctx.rotate((textbox.rotation * Math.PI) / 180);
  }
  ctx.translate(-boxW / 2, -boxH / 2);
  ctx.beginPath();
  ctx.rect(0, 0, boxW, boxH);
  ctx.clip();

  const fontWeight = textbox.fontWeight || "normal";
  const fontStyle = textbox.fontStyle || "normal";
  const fontFamily = textbox.fontFamily || "Arial";
  ctx.font = `${fontStyle} ${fontWeight} ${appliedFontPx}px ${fontFamily}`;
  ctx.textBaseline = "top";
  ctx.fillStyle = textbox.fontColor || "black";

  const addStroke = textbox.textStroke === "stroke";
  if (addStroke) {
    ctx.lineWidth = appliedFontPx * 0.05;
    ctx.strokeStyle = getContrastingColor(ctx.fillStyle);
  }

  visibleLines.forEach((line, index) => {
    const domWidth = visibleWidths[index] || 0;
    const scaledWidth = domWidth * scaleX;
    let drawX = 0;
    if (alignment === "center") {
      drawX = (boxW - scaledWidth) / 2;
    } else if (alignment === "right") {
      drawX = boxW - scaledWidth;
    }
    if (!Number.isFinite(drawX)) drawX = 0;
    const drawY = index * lineHeightPx;

    if (addStroke) {
      if (letterSpacingPx !== 0) {
        let currX = drawX;
        for (const ch of line) {
          ctx.strokeText(ch, currX, drawY);
          currX += ctx.measureText(ch).width + letterSpacingPx;
        }
      } else {
        ctx.strokeText(line, drawX, drawY);
      }
    }

    if (letterSpacingPx !== 0) {
      applyLetterSpacing(ctx, line, drawX, drawY, letterSpacingPx);
    } else {
      ctx.fillText(line, drawX, drawY);
    }
  });

  ctx.restore();
}


export const generateTexture = (
  containerRef,
  svgRef,
  textureCanvasRef,
  images,
  textboxes,
  color,
  selectedProduct,
  layerOrder = []
) => {
  if (!containerRef.current || !svgRef.current) {
    return Promise.reject(new Error("Missing refs"));
  }

  const canvas = textureCanvasRef.current;
  const ctx = canvas.getContext("2d");

  canvas.width = 2048;
  canvas.height = 2048;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Get the dynamic container size
  const containerSize = getContainerSize(svgRef.current);

  return new Promise((resolve, reject) => {
    const svgElement = svgRef.current;
    if (selectedProduct.selectedSvgIds.length > 0) {
      selectedProduct.selectedSvgIds.forEach((id) => {
        const element = svgElement.querySelector(`#${id}`);
        if (element) {
          element.setAttribute("fill", color);
        }
      });
    }

    // Clone the SVG
    const svgClone = svgElement.cloneNode(true);

    // Apply consistent black stroke to all paths
    svgClone.querySelectorAll("path").forEach((path) => {
      path.setAttribute("stroke", "none");
      path.setAttribute("stroke-width", "0");
      path.style.stroke = "none";
      path.style.strokeWidth = "0";
    });

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const svgImg = new Image();
    svgImg.onload = async () => {
      ctx.drawImage(svgImg, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const elements = getVisibleElements(images, textboxes, layerOrder);

      if (elements.length === 0) {
        const textureUrl = canvas.toDataURL("image/png", 1.0);
        resolve(textureUrl);
        return;
      }

      for (const element of elements) {
        if (element.type === "image") {
          await processImage(element, ctx, containerSize);
        } else {
          processText(element, ctx, containerSize);
        }
      }

      const textureUrl = canvas.toDataURL("image/png", 1.0);
      resolve(textureUrl);
    };

    svgImg.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG load failed"));
    };

    svgImg.src = url;
  });
};

/**
 * FILEEXPORT SVG GENERATION
 */
// Add texture generation queue to prevent multiple simultaneous generations
let textureGenerationQueue = Promise.resolve();
let lastGeneratedTexture = null;
let lastGenerationParams = null;

export const generateTextureForPart = (
  containerRef,
  svgRef,
  textureCanvasRef,
  images,
  textboxes,
  color,
  layerOrder = [],
  isSocksProduct = false
) => {
  // Create cache key
  const cacheKey = JSON.stringify({
    images: images?.map((i) => ({ id: i.id, src: i.src, x: i.x, y: i.y })),
    textboxes: textboxes?.map((t) => ({
      id: t.id,
      text: t.text,
      x: t.x,
      y: t.y,
    })),
    color,
    layerOrder,
    isSocksProduct,
  });

  // Return cached result if parameters haven't changed
  if (lastGenerationParams === cacheKey && lastGeneratedTexture) {
    return Promise.resolve(lastGeneratedTexture);
  }

  // Queue the generation to prevent parallel executions
  textureGenerationQueue = textureGenerationQueue.then(() =>
    generateTextureSVG(
      containerRef,
      svgRef,
      textureCanvasRef,
      images,
      textboxes,
      color,
      layerOrder,
      isSocksProduct
    ).then((result) => {
      lastGeneratedTexture = result;
      lastGenerationParams = cacheKey;
      return result;
    })
  );

  return textureGenerationQueue;
};

function generateTextureSVG(
  containerRef,
  svgRef,
  textureCanvasRef,
  images,
  textboxes,
  color,
  layerOrder,
  isSocksProduct = false
) {
  if (!containerRef.current || !svgRef.current) {
    return Promise.reject(new Error("Missing refs"));
  }

  const width = 2048;
  const height = 2048;

  return new Promise((resolve, reject) => {
    // Create SVG more efficiently
    const svgns = "http://www.w3.org/2000/svg";
    const newSvg = document.createElementNS(svgns, "svg");
    newSvg.setAttribute("width", width);
    newSvg.setAttribute("height", height);
    newSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    // Clone and process base paths
    const svgElement = svgRef.current;
    const baseGroup = document.createElementNS(svgns, "g");
    baseGroup.setAttribute("id", "base-layer");

    // Use querySelectorAll once
    const allPaths = svgElement.querySelectorAll("path");

    // Batch DOM operations
    const fragment = document.createDocumentFragment();
    allPaths.forEach((path) => {
      const pathClone = path.cloneNode(true);
      const pathId = path.id || path.getAttribute('id');
      
      // Get the current fill from the original path (preserves existing colors)
      const currentFill = path.getAttribute('fill') || path.style.fill || '#000000';
      
      console.log('Processing path:', pathId, 'current fill:', currentFill, 'isSocksProduct:', isSocksProduct);
      
      // Check if this path should receive the user's selected color
      // By checking if it's currently colored (not black)
      const isColoredPath = currentFill && currentFill !== '#000000' && currentFill !== '#000' && currentFill !== 'black' && currentFill !== 'rgb(0, 0, 0)';
      
      if (isColoredPath) {
        // Apply the selected color to paths that are meant to be colored
        pathClone.setAttribute("fill", color);
        console.log('Applied color', color, 'to path', pathId);
      } else {
        // Keep black fill for paths that are black (heel, toe, top)
        pathClone.setAttribute("fill", "#000000");
        console.log('✓ Kept black fill for', pathId);
      }
      
      pathClone.setAttribute("stroke", "#000000");
      pathClone.setAttribute("stroke-width", "1");
      fragment.appendChild(pathClone);
    });
    baseGroup.appendChild(fragment);

    if (allPaths.length === 0) {
      reject(new Error("No paths found in SVG"));
      return;
    }

    newSvg.appendChild(baseGroup);

    // Get dynamic container size
    const containerSize = getContainerSize(svgElement);

    // Process elements
    const elements = getVisibleElements(images, textboxes, layerOrder);

    // Use Promise.allSettled for better error handling
    Promise.allSettled(
      elements.map((element) => processElementToSVG(element, newSvg, width, height, containerSize))
    )
      .then(() => {
        // Serialize and create blob
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(newSvg);
        const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
        const url = URL.createObjectURL(svgBlob);
        resolve(url);
      })
      .catch(reject);
  });
}

// Helper to process individual elements
async function processElementToSVG(element, newSvg, width, height, containerSize) {
  const svgns = "http://www.w3.org/2000/svg";
  const group = document.createElementNS(svgns, "g");
  group.setAttribute("id", `layer-${element.id}`);

  // Scale X and Y separately to maintain aspect ratio
  const scaleX = width / containerSize.width;
  const scaleY = height / containerSize.height;
  const fontScale = (scaleX + scaleY) / 2;

  if (element.type === "image") {
    // Load and convert image
    const base64Data = await loadImageAsBase64(element.src);

    const imageElement = document.createElementNS(svgns, "image");
    imageElement.setAttributeNS(
      "http://www.w3.org/1999/xlink",
      "xlink:href",
      base64Data
    );
    imageElement.setAttribute("x", element.x * scaleX);
    imageElement.setAttribute("y", element.y * scaleY);
    imageElement.setAttribute("width", element.width * scaleX);
    imageElement.setAttribute(
      "height",
      element.height * scaleY
    );

    if (element.rotation) {
      const centerX = (element.x + element.width / 2) * scaleX;
      const centerY =
        (element.y + element.height / 2) * scaleY;
      imageElement.setAttribute(
        "transform",
        `rotate(${element.rotation} ${centerX} ${centerY})`
      );
    }

    group.appendChild(imageElement);
  } else {
    const layout = layoutText({
      text: element.text || "",
      width: element.width || 0,
      height: element.height || 0,
      fontSize: element.fontSize || 24,
      minFontSize: element.minFontSize || MIN_TEXTBOX_FONT_SIZE,
      fontFamily: element.fontFamily || "Arial",
      fontWeight: element.fontWeight || "normal",
      fontStyle: element.fontStyle || "normal",
      lineHeight: element.lineHeight || 1.2,
      letterSpacing: element.letterSpacing || 0,
    });

    const boxX = element.x * scaleX;
    const boxY = element.y * scaleY;
    const boxW = element.width * scaleX;
    const boxH = element.height * scaleY;

    const scaledFontSize = layout.fontSize * fontScale;
    const lineHeightPx = scaledFontSize * (element.lineHeight || 1.2);
    const letterSpacingPx = (element.letterSpacing || 0) * fontScale;
    const alignmentRaw = (element.textAlign || "left").toLowerCase();
    const alignment = ["left", "center", "right"].includes(alignmentRaw) ? alignmentRaw : "left";

    const maxVisibleLines = Math.max(1, Math.floor(boxH / Math.max(1, lineHeightPx)));
    const visibleLines = layout.lines.slice(0, maxVisibleLines);
    const visibleWidths = layout.lineWidths
      ? layout.lineWidths.slice(0, visibleLines.length)
      : visibleLines.map(() => 0);

    const text = document.createElementNS(svgns, "text");
    text.setAttribute("font-family", element.fontFamily || "Arial");
    text.setAttribute("font-size", scaledFontSize);
    text.setAttribute("fill", element.fontColor || "black");
    text.setAttribute("xml:space", "preserve");
    text.setAttribute("text-anchor", "start");
    text.setAttribute("dominant-baseline", "text-before-edge");
    if (letterSpacingPx !== 0) {
      text.setAttribute("letter-spacing", `${letterSpacingPx}`);
    }

    const centerX = (element.x + element.width / 2) * scaleX;
    const centerY = (element.y + element.height / 2) * scaleY;

    if (element.rotation) {
      text.setAttribute(
        "transform",
        `rotate(${element.rotation} ${centerX} ${centerY})`
      );
    }

    visibleLines.forEach((line, index) => {
      const domWidth = visibleWidths[index] || 0;
      const scaledWidth = domWidth * scaleX;
      let lineX = boxX;
      if (alignment === "center") {
        lineX = boxX + (boxW - scaledWidth) / 2;
      } else if (alignment === "right") {
        lineX = boxX + (boxW - scaledWidth);
      }
      if (!Number.isFinite(lineX)) lineX = boxX;
      const lineY = boxY + index * lineHeightPx;

      const tspan = document.createElementNS(svgns, "tspan");
      tspan.textContent = line;
      tspan.setAttribute("x", lineX);
      tspan.setAttribute("y", lineY);
      text.appendChild(tspan);
    });

    group.appendChild(text);
  }

  newSvg.appendChild(group);
}

// Cached image loader
const imageLoadCache = new Map();

async function loadImageAsBase64(src) {
  if (imageLoadCache.has(src)) {
    return imageLoadCache.get(src);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const base64 = canvas.toDataURL("image/png");
      imageLoadCache.set(src, base64);

      // Limit cache size
      if (imageLoadCache.size > 50) {
        const firstKey = imageLoadCache.keys().next().value;
        imageLoadCache.delete(firstKey);
      }

      resolve(base64);
    };
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}
export const clearTextureCache = () => {
  imageCache.clear();
  contrastColorCache.clear();
};