import { createSlice } from '@reduxjs/toolkit';
import { getReactPressUserInfo, isReactPressUserLoggedIn } from '../utils/userUtils';

const initialState = {
    userInfo: {},
    isLoggedIn: false,
    isInitialized: false,
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        initializeUser: (state) => {
            state.userInfo = getReactPressUserInfo();
            state.isLoggedIn = isReactPressUserLoggedIn();
            state.isInitialized = true;
        },
        updateUser: (state, action) => {
            state.userInfo = { ...state.userInfo, ...action.payload };
        },
        setUserLoginStatus: (state, action) => {
            state.isLoggedIn = action.payload;
        },
        resetUserState: () => {
            return initialState;
        },
    },
});

export const {
    initializeUser,
    updateUser,
    setUserLoginStatus,
    resetUserState,
} = userSlice.actions;

export default userSlice.reducer;
