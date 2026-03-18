// store/reducer/wishlistReducer.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  products: [], // { productId, variantId, name, slug, media, ... }
};

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    addToWishlist: (state, action) => {
      const exists = state.products.find(
        (p) =>
          p.productId === action.payload.productId &&
          p.variantId === action.payload.variantId
      );
      if (!exists) state.products.push(action.payload);
    },
    removeFromWishlist: (state, action) => {
      state.products = state.products.filter(
        (p) =>
          !(
            p.productId === action.payload.productId &&
            p.variantId === action.payload.variantId
          )
      );
    },
  },
});

export const { addToWishlist, removeFromWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;