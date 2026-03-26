// store/reducer/wishlistReducer.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  products: [],
};

const isSameItem = (a, b) =>
  a.productId?.toString() === b.productId?.toString() &&
  (a.variantId || null) === (b.variantId || null);

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    addToWishlist: (state, action) => {
      const exists = state.products.find((p) => isSameItem(p, action.payload));

      if (!exists) {
        state.products.push({
          productId: action.payload.productId,
          variantId: action.payload.variantId || null,
        });
      }
    },

    removeFromWishlist: (state, action) => {
      state.products = state.products.filter(
        (p) => !isSameItem(p, action.payload),
      );
    },
  },
});

export const { addToWishlist, removeFromWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
