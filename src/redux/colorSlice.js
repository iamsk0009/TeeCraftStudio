import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedPathId: null,
  color: "#ffffff",
};

const colorSlice = createSlice({
  name: "color",
  initialState,
  reducers: {
    setSelectedPath: (state, action) => {
      const { pathId } = action.payload;
      state.selectedPathId = pathId;
    },
    setColor: (state, action) => {
      const { color } = action.payload;
      state.color = color;
    },
    resetColorState: () => {
      return initialState;
    },
  },
});

export const { setSelectedPath, setColor, resetColorState } = colorSlice.actions;
export default colorSlice.reducer;
