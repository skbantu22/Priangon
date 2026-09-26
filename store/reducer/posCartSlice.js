import { createSlice } from "@reduxjs/toolkit";
import { normalizeCustomerType, rateForType } from "@/lib/priceTiers";

// every line is charged at the rate of the customer's type (dealer, retailer...)
const repriceCart = (state) => {
  const type = normalizeCustomerType(state.customer?.type);
  for (const item of state.cart) {
    if (item.rates) item.price = rateForType(item.rates, type);
  }
};

// ids may arrive as strings or ObjectId-like values: compare them as text
const sameId = (a, b) => a != null && b != null && String(a) === String(b);

// one line per variant: repeated lines (held sale, dealer order...) are merged
const mergeLines = (lines) => {
  const out = [];
  for (const line of lines) {
    const found = out.find((i) => sameId(i.variantId, line.variantId));
    if (found) {
      found.qty = (Number(found.qty) || 0) + (Number(line.qty) || 1);
      found.imeis = [...(found.imeis || []), ...(line.imeis || [])];
    } else {
      out.push({ ...line, qty: Number(line.qty) || 1 });
    }
  }
  return out;
};

const initialState = {
  cart: [],

  // Customer
  customer: null,

  // Discount
  discountType: "fixed", // fixed | percent
  discountValue: 0,

  // VAT
  vatType: "percent", // fixed | percent
  vatValue: 0,

  // Shipping
  shipping: 0,

  // Note
  note: "",
};

const posCartSlice = createSlice({
  name: "posCart",
  initialState,

  reducers: {
    // ==========================
    // CART
    // ==========================

    addToCart(state, action) {
      const item = action.payload;

      const existing = state.cart.find((i) => sameId(i.variantId, item.variantId));

      if (existing) {
        existing.qty += Number(item.qty) || 1;
      } else {
        state.cart.push({
          ...item,
          price: item.rates
            ? rateForType(item.rates, state.customer?.type)
            : item.price,
          qty: Number(item.qty) || 1,
        });
      }

      // also folds together any duplicate lines left from an older cart
      state.cart = mergeLines(state.cart);
    },

    increaseQty(state, action) {
      const item = state.cart.find((i) => sameId(i.variantId, action.payload));

      if (item) {
        item.qty += 1;
      }
    },

    decreaseQty(state, action) {
      const item = state.cart.find((i) => sameId(i.variantId, action.payload));

      if (!item) return;

      item.qty--;

      if (item.qty <= 0) {
        state.cart = state.cart.filter((i) => !sameId(i.variantId, action.payload));
      }
    },

    updateQty(state, action) {
      const { variantId, qty } = action.payload;

      const item = state.cart.find((i) => sameId(i.variantId, variantId));

      if (!item) return;

      item.qty = Math.max(1, Number(qty) || 1);
    },

    // IMEI / serial numbers typed for a cart line (one per unit)
    setItemImeis(state, action) {
      const { variantId, imeis } = action.payload;

      const item = state.cart.find((i) => sameId(i.variantId, variantId));

      if (item) item.imeis = imeis;
    },

    removeCartItem(state, action) {
      state.cart = state.cart.filter((i) => !sameId(i.variantId, action.payload));
    },

    clearCart(state) {
      state.cart = [];
      state.customer = null;
      state.discountType = "fixed";
      state.discountValue = 0;
      state.vatType = "percent";
      state.vatValue = 0;
      state.shipping = 0;
      state.note = "";
    },

    setCart(state, action) {
      state.cart = Array.isArray(action.payload) ? mergeLines(action.payload) : [];
    },

    // ==========================
    // CUSTOMER
    // ==========================

    setCustomer(state, action) {
      const before = normalizeCustomerType(state.customer?.type);
      state.customer = action.payload;
      if (normalizeCustomerType(state.customer?.type) !== before) repriceCart(state);
    },

    clearCustomer(state) {
      const before = normalizeCustomerType(state.customer?.type);
      state.customer = null;
      if (before !== "retail") repriceCart(state);
    },

    // ==========================
    // DISCOUNT
    // ==========================

    setDiscount(state, action) {
      state.discountType = action.payload.type || "fixed";
      state.discountValue = Number(action.payload.value) || 0;
    },

    clearDiscount(state) {
      state.discountType = "fixed";
      state.discountValue = 0;
    },

    // ==========================
    // VAT
    // ==========================

    setVat(state, action) {
      state.vatType = action.payload.type || "percent";
      state.vatValue = Number(action.payload.value) || 0;
    },

    clearVat(state) {
      state.vatType = "percent";
      state.vatValue = 0;
    },

    // ==========================
    // SHIPPING
    // ==========================

    setShipping(state, action) {
      state.shipping = Number(action.payload) || 0;
    },

    // ==========================
    // NOTE
    // ==========================

    setNote(state, action) {
      state.note = action.payload;
    },
  },
});

export const {
  addToCart,
  increaseQty,
  decreaseQty,
  updateQty,
  setItemImeis,
  removeCartItem,
  clearCart,
  setCart,

  setCustomer,
  clearCustomer,

  setDiscount,
  clearDiscount,

  setVat,
  clearVat,

  setShipping,

  setNote,
} = posCartSlice.actions;

export default posCartSlice.reducer;

// =========================================
// SELECTOR (Calculation Fixes)
// =========================================

export const selectPosSummary = (state) => {
  // Safe extraction with default fallback
  const posState = state?.posCart || {};
  const cart = Array.isArray(posState.cart) ? posState.cart : [];

  const discountType = posState.discountType || "fixed";
  const discountValue = Number(posState.discountValue) || 0;

  const vatType = posState.vatType || "percent";
  const vatValue = Number(posState.vatValue) || 0;

  const shipping = Number(posState.shipping) || 0;

  // 1. Subtotal calculation
  const subtotal = cart.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0),
    0,
  );

  // 2. Discount calculation
  let discount = 0;
  if (discountType === "percent") {
    discount = (subtotal * discountValue) / 100;
  } else {
    discount = discountValue;
  }
  // Clamp discount so it doesn't exceed subtotal
  discount = Math.min(discount, subtotal);

  // 3. After Discount Price
  const afterDiscount = Math.max(0, subtotal - discount);

  // 4. VAT calculation: each product's VAT / SD group, on its line after
  // its share of the sale discount, plus any VAT typed in on the cart
  const discountShare = subtotal > 0 ? afterDiscount / subtotal : 0;
  const groupVat = cart.reduce(
    (sum, item) =>
      sum + (Number(item.price) || 0) * (Number(item.qty) || 0) * discountShare * ((Number(item.vatPercent) || 0) / 100),
    0,
  );

  let vat = Math.round(groupVat * 100) / 100;
  if (vatType === "percent") {
    vat += (afterDiscount * vatValue) / 100;
  } else {
    vat += vatValue;
  }

  // 5. Grand Total calculation
  const total = Math.max(0, afterDiscount + vat + shipping);

  // 6. Total Items Quantity
  const totalQty = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  return {
    cart,
    subtotal: subtotal || 0,
    discount: discount || 0,
    afterDiscount: afterDiscount || 0,
    vat: vat || 0,
    shipping: shipping || 0,
    total: total || 0,
    totalQty: totalQty || 0,
  };
};
