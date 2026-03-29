import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  zoomLevel: 100,
};

const bottomControlsSlice = createSlice({
  name: 'bottomControls',
  initialState,
  reducers: {
    resetBottomControlsState: () => {
      return initialState;
    },
    setZoomLevel: (state, action) => {
      state.zoomLevel = Math.min(Math.max(action.payload, 50), 200);
    },
  }
});

export const {
  setZoomLevel,
  resetBottomControlsState
} = bottomControlsSlice.actions;

export default bottomControlsSlice.reducer;