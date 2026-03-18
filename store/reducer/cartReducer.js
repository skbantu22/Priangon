import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  count: 0,
  products: [],
};

export const cartReducer = createSlice({
  name: "cartStore",
  initialState,
  reducers: {
    addIntoCart: (state, action) => {
      const payload = action.payload;
      const qty = payload.quantity || 1;

      const index = state.products.findIndex(
        (product) =>
          product.productId === payload.productId &&
          product.variantId === payload.variantId
      );

      if (index >= 0) {
        state.products[index].quantity += qty;
      } else {
        state.products.push({
          ...payload,
          quantity: qty,
        });
      }

      state.count += qty;
    },

    increaseQuantity: (state, action) => {
      const { productId, variantId } = action.payload;

      const index = state.products.findIndex(
        (product) =>
          product.productId === productId &&
          product.variantId === variantId
      );

      if (index >= 0) {
        state.products[index].quantity += 1;
        state.count += 1;
      }
    },

    decreaseQuantity: (state, action) => {
      const { productId, variantId } = action.payload;

      const index = state.products.findIndex(
        (product) =>
          product.productId === productId &&
          product.variantId === variantId
      );

      if (index >= 0 && state.products[index].quantity > 1) {
        state.products[index].quantity -= 1;
        state.count -= 1;
      }
    },

    removeFromCart: (state, action) => {
      const removed = state.products.find(
        (product) =>
          product.productId === action.payload.productId &&
          product.variantId === action.payload.variantId
      );

      if (removed) {
        state.count -= removed.quantity;
      }

      state.products = state.products.filter(
        (product) =>
          !(
            product.productId === action.payload.productId &&
            product.variantId === action.payload.variantId
          )
      );
    },

    clearCart: (state) => {
      state.products = [];
      state.count = 0;
    },

    setCart: (state, action) => {
      const items = Array.isArray(action.payload) ? action.payload : [];

      state.products = items;
      state.count = items.reduce((total, item) => {
        return total + Number(item?.quantity || 1);
      }, 0);
    },
  },
});

export const {
  addIntoCart,
  increaseQuantity,
  decreaseQuantity,
  removeFromCart,
  clearCart,
  setCart,
} = cartReducer.actions;

export default cartReducer.reducer;