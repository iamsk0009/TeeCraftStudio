/**
 * Utility to transform element positions and sizes when switching products
 * Maps elements from old product's SVG paths to new product's SVG paths
 */

/**
 * Get bounding box for a specific SVG path by ID
 * @param {string} pathId - The ID of the SVG path element
 * @returns {Object|null} - Bounding box {x, y, width, height} or null if not found
 */
const getSvgPathBounds = (pathId) => {
  const pathElement = document.getElementById(pathId);
  if (!pathElement) {
    console.warn(`Path element not found: ${pathId}`);
    return null;
  }

  try {
    const bbox = pathElement.getBBox();
    const svgElement = pathElement.ownerSVGElement;
    
    if (!svgElement) {
      console.warn(`SVG element not found for path: ${pathId}`);
      return null;
    }

    const viewBox = svgElement.viewBox.baseVal;
    const svgWidth = viewBox.width || svgElement.clientWidth;
    const svgHeight = viewBox.height || svgElement.clientHeight;

    // Get actual container dimensions
    const container = svgElement.parentElement;
    const containerRect = container ? container.getBoundingClientRect() : svgElement.getBoundingClientRect();
    
    const scaleX = containerRect.width / svgWidth;
    const scaleY = containerRect.height / svgHeight;

    const bounds = {
      x: bbox.x * scaleX,
      y: bbox.y * scaleY,
      width: bbox.width * scaleX,
      height: bbox.height * scaleY,
    };

    return bounds;
  } catch (error) {
    console.error(`Error getting bounds for path ${pathId}:`, error);
    return null;
  }
};

/**
 * Transform an element from old product's path to new product's path
 * @param {Object} element - The element to transform (image or textbox)
 * @param {string} oldPathId - The old product's path ID
 * @param {string} newPathId - The new product's path ID
 * @returns {Object} - Transformed element with updated position and size
 */
export const transformElementForNewProduct = (element, oldPathId, newPathId) => {
  if (!element || !oldPathId || !newPathId) {
    return element;
  }

  // If element doesn't have a target element, skip transformation
  if (!element.targetElement) {
    return element;
  }

  const oldBounds = getSvgPathBounds(oldPathId);
  const newBounds = getSvgPathBounds(newPathId);

  if (!oldBounds || !newBounds) {
    console.warn(`Could not get bounds for paths: ${oldPathId} -> ${newPathId}`);
    // Return element with updated targetElement but original position
    return {
      ...element,
      targetElement: newPathId,
    };
  }

  // Calculate relative position within old bounds (0-1 range)
  const relativeX = (element.x - oldBounds.x) / oldBounds.width;
  const relativeY = (element.y - oldBounds.y) / oldBounds.height;
  
  // Calculate relative size (0-1 range)
  const relativeWidth = element.width / oldBounds.width;
  const relativeHeight = element.height / oldBounds.height;

  // Apply relative position and size to new bounds
  const newX = newBounds.x + (relativeX * newBounds.width);
  const newY = newBounds.y + (relativeY * newBounds.height);
  const newWidth = relativeWidth * newBounds.width;
  const newHeight = relativeHeight * newBounds.height;

  const transformed = {
    ...element,
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight,
    targetElement: newPathId, // Update to new path
  };

  return transformed;
};

/**
 * Get the corresponding path ID in the new product for an old path ID
 * Uses index-based mapping when path IDs are arrays
 * @param {string} oldPathId - Path ID from old product
 * @param {Array} oldPathIds - Array of old product's path IDs
 * @param {Array} newPathIds - Array of new product's path IDs
 * @returns {string} - Corresponding new path ID
 */
export const mapPathIdToNewProduct = (oldPathId, oldPathIds, newPathIds) => {
  if (!oldPathIds || !newPathIds || oldPathIds.length === 0 || newPathIds.length === 0) {
    return oldPathId;
  }

  // Find index in old paths
  const oldIndex = oldPathIds.indexOf(oldPathId);
  
  // If not found or out of bounds, use first path
  if (oldIndex === -1 || oldIndex >= newPathIds.length) {
    return newPathIds[0];
  }

  // Return corresponding new path
  return newPathIds[oldIndex];
};

/**
 * Transform all elements (images and textboxes) for a new product
 * @param {Array} images - Array of image elements
 * @param {Array} textboxes - Array of textbox elements
 * @param {Object} oldProduct - Previous product object
 * @param {Object} newProduct - New product object
 * @returns {Object} - {transformedImages, transformedTextboxes}
 */
export const transformAllElementsForNewProduct = (images, textboxes, oldProduct, newProduct) => {
  if (!oldProduct || !newProduct) {
    return { transformedImages: images, transformedTextboxes: textboxes };
  }

  const oldPathIds = oldProduct.selectedSvgIds || [];
  const newPathIds = newProduct.selectedSvgIds || [];
  
  // Default to first path if available
  const defaultNewPath = newPathIds.length > 0 ? newPathIds[0] : null;

  // Transform images
  const transformedImages = images.map(image => {
    // If image has no targetElement, assign it to the default path
    if (!image.targetElement) {
      return {
        ...image,
        targetElement: defaultNewPath,
      };
    }
    
    const newPathId = mapPathIdToNewProduct(image.targetElement, oldPathIds, newPathIds);
    return transformElementForNewProduct(image, image.targetElement, newPathId);
  });

  // Transform textboxes
  const transformedTextboxes = textboxes.map(textbox => {
    // If textbox has no targetElement, assign it to the default path
    if (!textbox.targetElement) {
      return {
        ...textbox,
        targetElement: defaultNewPath,
      };
    }
    
    const newPathId = mapPathIdToNewProduct(textbox.targetElement, oldPathIds, newPathIds);
    return transformElementForNewProduct(textbox, textbox.targetElement, newPathId);
  });

  return {
    transformedImages,
    transformedTextboxes,
  };
};
