import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isLoading: false,
    selectedTool: "",
    svgLoaded: false
};

const loadingSlice = createSlice({
    name: 'loading',
    initialState,
    reducers: {
        resetLoadingState: () => {
            return initialState;
        },
        setLoading: (state, action) => {
            state.isLoading = action.payload;
        },
        setSelectedTool: (state, action) => {
            state.selectedTool = action.payload;
        },
        setSvgLoaded: (state, action) => {
           state.svgLoaded = action.payload;
       },
        
    }
});

export const { setLoading, setSelectedTool ,resetLoadingState,setSvgLoaded} = loadingSlice.actions;
export default loadingSlice.reducer;