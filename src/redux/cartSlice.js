import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  totalPrice: 0,
  quantities: {},
  isSaving: false,
  cartItems: [],
  printFiles: null
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setTotalPrice: (state, action) => {
      state.totalPrice = action.payload;
    },
    setSelectedSize: (state, action) => {
      state.selectedSize = action.payload;
    },
    updateQuantity: (state, action) => {
      const { size, change } = action.payload;
      state.quantities[size] = (state.quantities[size] || 0) + change;
      if (state.quantities[size] < 0) state.quantities[size] = 0;
    },
    resetCartState: () => {
      return initialState;
    },
    addToCartItems: (state, action) => {
      const { product, quantities, totalPrice } = action.payload;
      
      // Create cart item for each size/quantity
      Object.entries(quantities).forEach(([size, quantity]) => {
        if (quantity > 0) {
          const existingItemIndex = state.cartItems.findIndex(
            item => item.productId === product.id && item.size === size
          );
          
          if (existingItemIndex >= 0) {
            // Update existing item quantity
            state.cartItems[existingItemIndex].quantity += quantity;
            state.cartItems[existingItemIndex].totalPrice = state.cartItems[existingItemIndex].quantity * totalPrice;
          } else {
            // Add new item
            state.cartItems.push({
              id: `${product.id}-${size}-${Date.now()}`,
              productId: product.id,
              productName: product.name,
              size: size,
              quantity: quantity,
              unitPrice: totalPrice,
              totalPrice: totalPrice * quantity,
              thumbnail: product.thumbnailUrl,
              addedAt: new Date().toISOString()
            });
          }
        }
      });
    },
    removeFromCartItems: (state, action) => {
      const itemId = action.payload;
      state.cartItems = state.cartItems.filter(item => item.id !== itemId);
    },
    clearCartItems: (state) => {
      state.cartItems = [];
    },
    setSavingState: (state, action) => {
      state.isSaving = action.payload;
    },
    setPrintFiles: (state, action) => {
      state.printFiles = action.payload;
    }
  }
});

export const {
  setTotalPrice,
  setSelectedSize,
  updateQuantity,
  resetCartState,
  addToCartItems,
  removeFromCartItems,
  clearCartItems,
  setSavingState,
  setPrintFiles
} = cartSlice.actions;

export default cartSlice.reducer;
