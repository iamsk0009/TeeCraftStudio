import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  generatedImages: []
};

const aiSlice = createSlice({
  name: 'aiImages',
  initialState,
  reducers: {
    setGeneratedImages: (state, action) => {
      state.generatedImages = action.payload;
    },
    addGeneratedImage: (state, action) => {
      state.generatedImages.push(action.payload);
    },
    resetGeneratedImages: (state) => {
      state.generatedImages = [];
    }
  }
});

export const { setGeneratedImages, addGeneratedImage, resetGeneratedImages } = aiSlice.actions;

export default aiSlice.reducer;
