import { saveToIndexedDB, getFromIndexedDB } from "./indexedDB";
import { generateTextureForPart } from "./generateTexture";
import localData from "../../data/localData.json";

// Helper: Clean undefined keys recursively
const cleanUndefined = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const cleaned = Array.isArray(obj) ? [] : {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) {
      cleaned[key] = typeof value === "object" ? cleanUndefined(value) : value;
    }
  });
  return Array.isArray(obj) ? [...cleaned] : cleaned;
};

// Helper: Convert a blob URL to a data URL.
const blobUrlToDataUrl = async (blobUrl, isSvg = false) => {
  try {
    const blob = await fetch(blobUrl).then(r => r.blob());

    if (isSvg || blob.type === 'image/svg+xml') {
      const svgText = await blob.text();
      const processedSvg = svgText.includes('<?xml') ? svgText : 
        `<?xml version="1.0" encoding="UTF-8"?>${svgText}`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(processedSvg)}`;
    }

    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onloadend = () => resolve(fr.result);
      fr.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting blob URL to data URL:', error);
    throw error;
  }
};

// Normalize images for local save
const normalizeImagesForLocalSave = async (images = []) => {
  const out = [];

  for (const img of images) {
    const copy = { ...img };
    const src = copy.src || '';

    if (src.startsWith('blob:')) {
      const dataUrl = await blobUrlToDataUrl(src, !!copy.isSvg);
      copy.src = dataUrl;
    } else if (src.startsWith('data:')) {
      copy.src = src;
    }

    if (copy.src === '' || (copy.src && copy.src.startsWith('blob:'))) {
      delete copy.src;
    }

    out.push(copy);
  }

  return out;
};

export const saveDesignToLocalStorage = async (designData) => {
  const { designId, color, images, textboxes, productId, textureUrl } =
    designData;
  if (!designId) {
    throw new Error("Design ID is required");
  }
  if (!productId) {
    throw new Error("Product ID is required");
  }

  try {
    const cleanedTextboxes = (textboxes || []).map((textbox) => {
      const cleanTextbox = { ...textbox };
      Object.keys(cleanTextbox).forEach((key) => {
        if (cleanTextbox[key] === undefined) {
          delete cleanTextbox[key];
        }
      });
      return cleanTextbox;
    });

    const normalizedImages = await normalizeImagesForLocalSave(images || []);
    const cleanedImages = normalizedImages.map((image) => {
      const cleanImage = { ...image };
      Object.keys(cleanImage).forEach((key) => {
        if (cleanImage[key] === undefined) {
          delete cleanImage[key];
        }
      });
      return cleanImage;
    });

    // Save heavy data to IndexedDB
    const heavyData = {
      designId,
      images: cleanedImages,
      textboxes: cleanedTextboxes,
    };
    await saveToIndexedDB(heavyData);

    // Save light data to localStorage
    const lightData = {
      designId,
      color: color || "#ffffff",
      productId,
      textureUrl: textureUrl || null,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(`design_${designId}`, JSON.stringify(lightData));
    // Also set the last active design
    localStorage.setItem("design", JSON.stringify(lightData));

    return { success: true };
  } catch (error) {
    console.error("Error saving design locally:", error);
    throw error;
  }
};

export const fetchDesignFromLocalStorage = async (designIdParam = null) => {
  try {
    let designId = designIdParam;
    
    // If no designId provided, get the last one from "design" key
    if (!designId) {
      const lastDesignStr = localStorage.getItem("design");
      if (!lastDesignStr) return null;
      designId = JSON.parse(lastDesignStr).designId;
    }

    // Get light data from localStorage using unique key
    const lightDataStr = localStorage.getItem(`design_${designId}`) || localStorage.getItem("design");
    if (!lightDataStr) {
      return null;
    }
    const lightData = JSON.parse(lightDataStr);
    designId = lightData.designId;

    // Get heavy data from IndexedDB
    const heavyData = await getFromIndexedDB(designId);
    
    // Combine both data sources
    const sanitizedDesignData = {
      ...lightData,
      images: heavyData?.images || [],
      textboxes: heavyData?.textboxes || [],
      designId: designId,
    };

    // Find product data from local JSON
    const productData = localData.products.find(p => p.id === sanitizedDesignData.productId);

    if (!productData) {
      console.warn(`Product ${sanitizedDesignData.productId} not found in local data`);
      return null;
    }

    return {
      design: sanitizedDesignData,
      product: productData,
      aiImages: [] 
    };
  } catch (error) {
    console.error("Error fetching local design:", error);
    return null; // Return null instead of throwing to prevent component crashes
  }
};
