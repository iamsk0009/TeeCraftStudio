// Helper function to get actual container dimensions from SVG
const getContainerDimensions = (svgElement) => {
  if (!svgElement) return { width: 500, height: 500 };
  
  // Get the parent container's dimensions (svgContainerRef in UvPath)
  const container = svgElement.parentElement;
  if (container) {
    const rect = container.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }
  
  // Fallback to SVG's own dimensions
  const svgRect = svgElement.getBoundingClientRect();
  return { width: svgRect.width, height: svgRect.height };
};

export const getPathBoundingBox = (pathId) => {
  const path = document.getElementById(pathId);
  if (!path) return null;

  const bbox = path.getBBox();
  const svgElement = path.ownerSVGElement;
  const svgRect = svgElement.getBoundingClientRect();

  const viewBox = svgElement.viewBox.baseVal;
  const svgWidth = viewBox.width || svgElement.clientWidth;
  const svgHeight = viewBox.height || svgElement.clientHeight;

  // Get actual container dimensions
  const { width: containerWidth, height: containerHeight } = getContainerDimensions(svgElement);

  const scaleX = svgRect.width / svgWidth;
  const scaleY = svgRect.height / svgHeight;

  const relativeBounds = {
    left: bbox.x * scaleX * (containerWidth / svgRect.width),
    top: bbox.y * scaleY * (containerHeight / svgRect.height),
    width: bbox.width * scaleX * (containerWidth / svgRect.width),
    height: bbox.height * scaleY * (containerHeight / svgRect.height),
  };

  relativeBounds.right = relativeBounds.left + relativeBounds.width;
  relativeBounds.bottom = relativeBounds.top + relativeBounds.height;

  return relativeBounds;
};

export const constrainElementToPath = (
  element,
  newPosition,
  newSize,
  pathId,
  preserveAspectRatio = true
) => {
  if (!pathId) return { position: newPosition, size: newSize };

  const bounds = getPathBoundingBox(pathId);
  if (!bounds) return { position: newPosition, size: newSize };

  // Compute constrained size.
  // When preserveAspectRatio is true, behave as before (fit while keeping aspect).
  // When false, clamp width/height independently to the path bounds.
  const minSize = 20;
  let constrainedWidth;
  let constrainedHeight;

  if (preserveAspectRatio) {
    const aspectRatio = newSize.width / newSize.height;
    constrainedWidth = Math.min(newSize.width, bounds.width);
    constrainedHeight = Math.min(newSize.height, bounds.height);

    // Adjust dimensions to maintain aspect ratio while fitting within bounds
    if (constrainedWidth / constrainedHeight > aspectRatio) {
      constrainedWidth = constrainedHeight * aspectRatio;
    } else {
      constrainedHeight = constrainedWidth / aspectRatio;
    }

    constrainedWidth = Math.max(constrainedWidth, minSize);
    constrainedHeight = Math.max(constrainedHeight, minSize);
  } else {
    constrainedWidth = Math.max(minSize, Math.min(newSize.width, bounds.width));
    constrainedHeight = Math.max(minSize, Math.min(newSize.height, bounds.height));
  }

  const constrainedSize = {
    width: constrainedWidth,
    height: constrainedHeight,
  };

  // Constrain position to keep element within path bounds
  const constrainedPosition = {
    x: Math.max(bounds.left, Math.min(bounds.right - constrainedSize.width, newPosition.x)),
    y: Math.max(bounds.top, Math.min(bounds.bottom - constrainedSize.height, newPosition.y)),
  };

  return {
    position: constrainedPosition,
    size: constrainedSize,
  };
};

export const isElementInPath = (element, pathId) => {
  const path = document.getElementById(pathId);
  if (!path) return false;

  const svg = path.ownerSVGElement;
  const viewBox = svg.viewBox.baseVal;
  const svgWidth = viewBox.width || svg.clientWidth;
  const svgHeight = viewBox.height || svg.clientHeight;

  // Get actual container dimensions
  const { width: containerWidth, height: containerHeight } = getContainerDimensions(svg);

  // Scale factors between container and SVG coordinates
  const scaleX = svgWidth / containerWidth;
  const scaleY = svgHeight / containerHeight;

  // Convert element corners to SVG coordinate space
  const corners = [
    { x: element.x, y: element.y },
    { x: element.x + element.width, y: element.y },
    { x: element.x + element.width, y: element.y + element.height },
    { x: element.x, y: element.y + element.height },
  ];

  // Check if all corners are within the path
  return corners.every((corner) => {
    const point = svg.createSVGPoint();
    // Convert container coordinates to SVG coordinates
    point.x = corner.x * scaleX;
    point.y = corner.y * scaleY;

    return path.isPointInFill(point);
  });
};
