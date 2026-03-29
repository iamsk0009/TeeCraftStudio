import { createSlice } from '@reduxjs/toolkit';

const textureSlice = createSlice({
  name: 'texture',
  initialState: {
    textureUrl: null,
  },
  reducers: {
    setTextureUrl: (state, action) => {
      state.textureUrl = action.payload;
    },
    resetTextureState: (state) => {
      state.textureUrl = null;
    },
  },
});

export const { setTextureUrl, resetTextureState } = textureSlice.actions;
export default textureSlice.reducer;
