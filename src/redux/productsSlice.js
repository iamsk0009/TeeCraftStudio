import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  products: [],
  categories: [{ id: "all", name: "All" }],
  selectedCategory: { id: "all", name: "All" },
  selectedProduct: null,
  isLoaded: false,
  uploadCategories : [{ id: "all", name: "All" }],
  uploadImages:[],
  uploadsLoaded: false,
};

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    resetProductsState: () => {
      return initialState;
    },

    setProducts: (state, action) => {
      state.products = action.payload;
      state.isLoaded = true;

      action.payload.forEach((product) => {
        const img = new Image();
        img.src = product.thumbnailUrl;
      });
    },
    setCategories: (state, action) => {
      state.categories = [{ id: "all", name: "All" }, ...action.payload];
      state.isLoaded = true;
    },
    setSelectedCategory: (state, action) => {
      state.selectedCategory = action.payload;
    },
    setSelectedProduct: (state, action) => {
      state.selectedProduct = action.payload;
    },
    setUploadCategories: (state, action) => {
      state.uploadCategories = [{ id: "all", name: "All" }, ...action.payload];
    },
    setUploadImages: (state, action) => {
      state.uploadImages = action.payload;
    },
    
    setUploadsLoaded: (state, action) => {
      state.uploadsLoaded = action.payload;
    }
  },
});

export const {
  setProducts,
  setCategories,
  setSelectedCategory,
  setSelectedProduct,
  resetProductsState,
  setUploadCategories,
  setUploadImages,
  setUploadsLoaded
} = productsSlice.actions;

export default productsSlice.reducer;
