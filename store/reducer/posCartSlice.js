// redux/posCartSlice.js

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  cart: [],
};

const posCartSlice = createSlice({
  name: "posCart",
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload;

      const existing = state.cart.find((i) => i.variantId === item.variantId);

      if (existing) {
        existing.qty += item.qty || 1;
      } else {
        state.cart.push({
          ...item,
          qty: item.qty || 1,
        });
      }
    },

    increaseQty: (state, action) => {
      const variantId = action.payload;

      const item = state.cart.find((i) => i.variantId === variantId);

      if (item) {
        item.qty += 1;
      }
    },

    decreaseQty: (state, action) => {
      const variantId = action.payload;

      const item = state.cart.find((i) => i.variantId === variantId);

      if (!item) return;

      item.qty -= 1;

      if (item.qty <= 0) {
        state.cart = state.cart.filter((i) => i.variantId !== variantId);
      }
    },

    removeCartItem: (state, action) => {
      const variantId = action.payload;

      state.cart = state.cart.filter((i) => i.variantId !== variantId);
    },

    clearCart: (state) => {
      state.cart = [];
    },

    setCart: (state, action) => {
      state.cart = Array.isArray(action.payload) ? action.payload : [];
    },
  },
});

export const {
  addToCart,
  increaseQty,
  decreaseQty,
  removeCartItem,
  clearCart,
  setCart,
} = posCartSlice.actions;

export default posCartSlice.reducer;
