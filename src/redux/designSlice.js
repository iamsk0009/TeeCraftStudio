import { createSlice } from '@reduxjs/toolkit';

const initialState = {
   designId: null,
};

const designSlice = createSlice({
    name: 'design',
    initialState,
    reducers: {
        setDesignId: (state, action) => {
            const { designId } = action.payload;
            state.designId = designId;
        },

    },
});

export const { setDesignId } = designSlice.actions;
export default designSlice.reducer;
