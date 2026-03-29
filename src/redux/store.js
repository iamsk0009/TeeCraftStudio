
import { configureStore } from "@reduxjs/toolkit";
import colorReducer from "./colorSlice";
import textureReducer from "./textureSlice";
import uploadReducer from "./uploadSlice";
import loadingReducer from "./loadingSlice";
import bottomControlsReducer from "./bottomControlsSlice";
import productsReducer from "./productsSlice";
import cartReducer from "./cartSlice";
import userReducer from "./userSlice";
import aiReducer from "./aiSlices";
import designReducer from "./designSlice";

const store = configureStore({
  reducer: {
    color: colorReducer,
    texture: textureReducer,
    upload: uploadReducer,
    loading: loadingReducer,
    bottomControls: bottomControlsReducer,
    products: productsReducer,
    cart: cartReducer,
    user: userReducer,
    design: designReducer,
    aiImages: aiReducer,
  },
});

export default store;