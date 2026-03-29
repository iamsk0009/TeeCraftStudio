import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";

const initialState = {
  images: [],
  textboxes: [],
  selectedImage: null,
  selectedTextbox: null,
  selectedElement: null,
  layerOrder: [],
  activeElements: {},
};

const uploadSlice = createSlice({
  name: "upload",
  initialState,
  reducers: {
    resetUploadState: () => {
      return initialState;
    },
    addImage: (state, action) => {
      const payload = action.payload;
      const url = payload.src || payload.imageUrl || "";
      // Improved SVG detection: check extension before query params and respect payload
      const urlWithoutQuery = url.split("?")[0];
      const ext = urlWithoutQuery.split(".").pop().toLowerCase();
      // Check both payload.isSvg and URL extension
      const isSvg = payload.isSvg || ext === "svg";

      const newImage = {
        ...payload,
        onCanvas: true,
        rotation: 0,
        isUserUploaded: payload.isUserUploaded || false,
        isSvg,
        // For SVGs, maintain originalSrc from payload or set from URL
        originalSrc: isSvg ? (payload.originalSrc || url) : undefined,
        src: url,
        svgColor: isSvg ? payload.svgColor : undefined,
        svgStrokeColor: isSvg ? payload.svgStrokeColor : undefined
      };
      state.images.push(newImage);
      state.layerOrder.push({ type: "image", id: newImage.id });
      if (newImage.targetElement) {
        state.activeElements[newImage.targetElement] = true;
      }
    },
    setSelectedImage: (state, action) => {
      state.selectedImage = action.payload;
    },
    updateImagePosition: (state, action) => {
      const { id, x, y, width, height, onCanvas, rotation } = action.payload;
      const image = state.images.find((img) => img.id === id);
      if (image) {
        image.x = x;
        image.y = y;
        image.width = width;
        image.height = height;
        image.onCanvas = onCanvas;
        if (rotation !== undefined) image.rotation = rotation;
      }
    },
    deleteImage: (state, action) => {
      const id = action.payload;

      const image = state.images.find((img) => img.id === id);
      
      // Handle element cleanup
      if (image && image.targetElement) {
        const otherImagesForElement = state.images.filter(
          (img) => img.id !== id && img.targetElement === image.targetElement
        );
        if (otherImagesForElement.length === 0) {
          delete state.activeElements[image.targetElement];
        }
      }

      state.images = state.images.filter((img) => img.id !== id);
      state.layerOrder = state.layerOrder.filter(
        (item) => !(item.type === "image" && item.id === id)
      );

      if (state.selectedImage?.id === id) {
        state.selectedImage = null;
      }
    },

    duplicateImage: (state, action) => {
      const { id, onUpdateTexture } = action.payload;
      const originalImage = state.images.find((img) => img.id === id);
      if (originalImage) {
        const newImage = {
          ...originalImage,
          id: uuidv4(),
          x: originalImage.x + 10,
          y: originalImage.y + 10,
          isUserUploaded: originalImage.isUserUploaded, // Preserve isUserUploaded
          isSvg: originalImage.isSvg,
          // For SVGs, ensure we use the originalSrc to generate new blobs
          originalSrc: originalImage.isSvg ? originalImage.originalSrc : undefined,
          // For SVGs, don't copy the blob URL, let it be regenerated
          src: originalImage.isSvg ? originalImage.originalSrc : originalImage.src,
          svgColor: originalImage.svgColor,
          svgStrokeColor: originalImage.svgStrokeColor,
        };
        state.images.push(newImage);
        state.layerOrder.push({ type: "image", id: newImage.id });
        state.selectedImage = newImage.id;
        state.selectedElement = {
          type: "image",
          id: newImage.id,
          onUpdateTexture,
        };
      }
    },
    updateImageSvgColor: (state, action) => {
      const { id, color } = action.payload;
      const image = state.images.find((img) => img.id === id);
      if (image && image.isSvg) {
        image.svgColor = color;
      }
    },
    // NEW reducer
setImageSrc: (state, action) => {
  const { id, src } = action.payload;
  const img = state.images.find(i => i.id === id);
  if (img) img.src = src;
},

    addTextbox: (state, action) => {
      const newTextbox = {
        ...action.payload,
        onCanvas: true,
        rotation: 0,
        fontSize: action.payload.fontSize || 24,
        fontFamily: action.payload.fontFamily || "Arial",
        fontColor: action.payload.fontColor || "#ff0000",
        textAlign: action.payload.textAlign || "center",
        fontWeight: action.payload.fontWeight || "normal",
        fontStyle: action.payload.fontStyle || "normal",
        lineHeight: action.payload.lineHeight || 1.2,
        letterSpacing: action.payload.letterSpacing || 0,
        textStroke: action.payload.textStroke || "none",
        textShadow: action.payload.textShadow || "none",
      };
      state.textboxes.push(newTextbox);
      state.layerOrder.push({ type: "textbox", id: newTextbox.id });
      if (newTextbox.targetElement) {
        state.activeElements[newTextbox.targetElement] = true;
      }
    },
    setSelectedTextbox: (state, action) => {
      state.selectedTextbox = action.payload;
    },
    updateTextboxPosition: (state, action) => {
      const { id, x, y, width, height, onCanvas, rotation } = action.payload;
      const textbox = state.textboxes.find((tb) => tb.id === id);
      if (textbox) {
        textbox.x = x;
        textbox.y = y;
        textbox.width = width;
        textbox.height = height;
        textbox.onCanvas = onCanvas;
        if (rotation !== undefined) textbox.rotation = rotation;
      }
    },
    updateTextboxContent: (state, action) => {
      const { id, text } = action.payload;
      const textbox = state.textboxes.find((tb) => tb.id === id);
      if (textbox) {
        textbox.text = text;
      }
    },
    updateTextboxStyle: (state, action) => {
      const {
        id,
        fontSize,
        fontFamily,
        fontColor,
        textAlign,
        fontWeight,
        fontStyle,
        lineHeight,
        letterSpacing,
        textStroke,
        textShadow,
      } = action.payload;
      const textbox = state.textboxes.find((tb) => tb.id === id);
      if (textbox) {
        if (fontSize !== undefined) textbox.fontSize = fontSize;
        if (fontFamily !== undefined) textbox.fontFamily = fontFamily;
        if (fontColor !== undefined) textbox.fontColor = fontColor;
        if (textAlign !== undefined) textbox.textAlign = textAlign;
        if (fontWeight !== undefined) textbox.fontWeight = fontWeight;
        if (fontStyle !== undefined) textbox.fontStyle = fontStyle;
        if (lineHeight !== undefined) textbox.lineHeight = lineHeight;
        if (letterSpacing !== undefined) textbox.letterSpacing = letterSpacing;
        if (textStroke !== undefined) textbox.textStroke = textStroke;
        if (textShadow !== undefined) textbox.textShadow = textShadow;
      }
    },
    deleteTextbox: (state, action) => {
      const id = action.payload;
      const textbox = state.textboxes.find((tb) => tb.id === id);
      if (textbox && textbox.targetElement) {
        const otherTextboxesForElement = state.textboxes.filter(
          (tb) => tb.id !== id && tb.targetElement === textbox.targetElement
        );
        const imagesForElement = state.images.filter(
          (img) => img.targetElement === textbox.targetElement
        );
        if (
          otherTextboxesForElement.length === 0 &&
          imagesForElement.length === 0
        ) {
          delete state.activeElements[textbox.targetElement];
        }
      }
      state.textboxes = state.textboxes.filter((tb) => tb.id !== id);
      state.layerOrder = state.layerOrder.filter(
        (item) => !(item.type === "textbox" && item.id === id)
      );
      if (state.selectedTextbox?.id === id) {
        state.selectedTextbox = null;
      }
    },
    duplicateTextbox: (state, action) => {
      const { id, onUpdateTexture } = action.payload;
      const originalTextbox = state.textboxes.find((tb) => tb.id === id);
      if (originalTextbox) {
        const newTextbox = {
          ...originalTextbox,
          id: uuidv4(),
          x: originalTextbox.x + 10,
          y: originalTextbox.y + 10,
        };
        state.textboxes.push(newTextbox);
        state.layerOrder.push({ type: "textbox", id: newTextbox.id });
        state.selectedTextbox = newTextbox.id;
        state.selectedElement = {
          type: "textbox",
          id: newTextbox.id,
          onUpdateTexture,
        };
      }
    },
    setSelectedElement: (state, action) => {
      state.selectedElement = action.payload;
    },
    moveElementUp: (state, action) => {
      const { type, id } = action.payload;
      const currentIndex = state.layerOrder.findIndex(
        (item) => item.type === type && item.id === id
      );
      if (currentIndex > 0) {
        const temp = state.layerOrder[currentIndex - 1];
        state.layerOrder[currentIndex - 1] = state.layerOrder[currentIndex];
        state.layerOrder[currentIndex] = temp;
      }
    },
    moveElementDown: (state, action) => {
      const { type, id } = action.payload;
      const currentIndex = state.layerOrder.findIndex(
        (item) => item.type === type && item.id === id
      );
      if (currentIndex !== -1 && currentIndex < state.layerOrder.length - 1) {
        const temp = state.layerOrder[currentIndex + 1];
        state.layerOrder[currentIndex + 1] = state.layerOrder[currentIndex];
        state.layerOrder[currentIndex] = temp;
      }
    },
    moveImageUp: (state, action) => {
      const { id } = action.payload;
      const currentIndex = state.layerOrder.findIndex(
        (item) => item.type === "image" && item.id === id
      );
      if (currentIndex > 0) {
        const temp = state.layerOrder[currentIndex - 1];
        state.layerOrder[currentIndex - 1] = state.layerOrder[currentIndex];
        state.layerOrder[currentIndex] = temp;
      }
    },
    moveImageDown: (state, action) => {
      const { id } = action.payload;
      const currentIndex = state.layerOrder.findIndex(
        (item) => item.type === "image" && item.id === id
      );
      if (currentIndex !== -1 && currentIndex < state.layerOrder.length - 1) {
        const temp = state.layerOrder[currentIndex + 1];
        state.layerOrder[currentIndex + 1] = state.layerOrder[currentIndex];
        state.layerOrder[currentIndex] = temp;
      }
    },
    moveTextboxUp: (state, action) => {
      const { id } = action.payload;
      const currentIndex = state.layerOrder.findIndex(
        (item) => item.type === "textbox" && item.id === id
      );
      if (currentIndex > 0) {
        const temp = state.layerOrder[currentIndex - 1];
        state.layerOrder[currentIndex - 1] = state.layerOrder[currentIndex];
        state.layerOrder[currentIndex] = temp;
      }
    },
    moveTextboxDown: (state, action) => {
      const { id } = action.payload;
      const currentIndex = state.layerOrder.findIndex(
        (item) => item.type === "textbox" && item.id === id
      );
      if (currentIndex !== -1 && currentIndex < state.layerOrder.length - 1) {
        const temp = state.layerOrder[currentIndex + 1];
        state.layerOrder[currentIndex + 1] = state.layerOrder[currentIndex];
        state.layerOrder[currentIndex] = temp;
      }
    },
    // Bulk update images (used when switching products)
    updateAllImages: (state, action) => {
      state.images = action.payload;
    },
    // Bulk update textboxes (used when switching products)
    updateAllTextboxes: (state, action) => {
      state.textboxes = action.payload;
    },
  },
});

export const {
  addImage,
  setSelectedImage,
  updateImagePosition,
  deleteImage,
  duplicateImage,
  addTextbox,
  setSelectedTextbox,
  updateTextboxPosition,
  updateTextboxContent,
  updateTextboxStyle,
  deleteTextbox,
  duplicateTextbox,
  setSelectedElement,
  moveElementUp,
  moveElementDown,
  moveImageUp,
  moveImageDown,
  moveTextboxUp,
  moveTextboxDown,
  resetUploadState,
  updateImageSvgColor,
  setImageSrc,
  updateAllImages,
  updateAllTextboxes,
} = uploadSlice.actions;

export default uploadSlice.reducer;
