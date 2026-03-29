// src/redux/actions/deleteImageSafe.js
import { deleteImage } from "../redux/uploadSlice";
import { svgStore } from "./svgStore";

export const deleteImageSafe = (id) => (dispatch, getState) => {
  const img = getState().upload.images.find(i => i.id === id);
  if (img) {
    // Revoke current display URL if it's a blob
    if (img.src && typeof img.src === 'string' && img.src.startsWith('blob:')) {
      try { URL.revokeObjectURL(img.src); } catch (e) {}
    }
    // Clear all colored variants we cached for this original SVG
    if (img.originalSrc) {
      try { svgStore.revokeForSrc(img.originalSrc); } catch (e) {}
    }
  }
  dispatch(deleteImage(id));
};
