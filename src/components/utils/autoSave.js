// services/autoSave.js
import { getDoc } from "firebase/firestore";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// Auto-save single image
export const saveImageToFirestore = async (userId, designId, image) => {
  const designDocRef = doc(db, "designs", userId, "mydesigns", designId);
  
  try {
    await updateDoc(designDocRef, {
      images: arrayUnion(image),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error auto-saving image:", error);
    throw error;
  }
};

// Delete single image
export const deleteImageFromFirestore = async (userId, designId, imageId) => {
  const designDocRef = doc(db, "designs", userId, "mydesigns", designId);
  
  try {
    // First fetch current images
    const designDoc = await getDoc(designDocRef);
    const currentImages = designDoc.data().images || [];
    
    // Remove the image with matching ID
    const updatedImages = currentImages.filter(img => img.id !== imageId);
    
    await updateDoc(designDocRef, {
      images: updatedImages,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
};

// Auto-save single textbox
export const saveTextboxToFirestore = async (userId, designId, textbox) => {
  const designDocRef = doc(db, "designs", userId, "mydesigns", designId);
  
  try {
    await updateDoc(designDocRef, {
      textboxes: arrayUnion(textbox),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error auto-saving textbox:", error);
    throw error;
  }
};

// Delete single textbox
export const deleteTextboxFromFirestore = async (userId, designId, textboxId) => {
  const designDocRef = doc(db, "designs", userId, "mydesigns", designId);
  
  try {
    const designDoc = await getDoc(designDocRef);
    const currentTextboxes = designDoc.data().textboxes || [];
    const updatedTextboxes = currentTextboxes.filter(tb => tb.id !== textboxId);
    
    await updateDoc(designDocRef, {
      textboxes: updatedTextboxes,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error deleting textbox:", error);
    throw error;
  }
};

// Update textbox properties (for edits)
export const updateTextboxInFirestore = async (userId, designId, textboxId, updates) => {
  const designDocRef = doc(db, "designs", userId, "mydesigns", designId);
  
  try {
    const designDoc = await getDoc(designDocRef);
    const currentTextboxes = designDoc.data().textboxes || [];
    const updatedTextboxes = currentTextboxes.map(tb => 
      tb.id === textboxId ? { ...tb, ...updates } : tb
    );
    
    await updateDoc(designDocRef, {
      textboxes: updatedTextboxes,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating textbox:", error);
    throw error;
  }
};