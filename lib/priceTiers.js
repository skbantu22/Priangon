// Price list of a product, one rate per kind of buyer.
// Example: purchase 600 · dealer 700 · sub dealer 750 · retailer 800 · retail 1000
// A customer's `type` picks which rate the POS charges them.

export const CUSTOMER_TYPES = {
  retail: { label: "Retail (খুচরা)", short: "Retail", field: "sellingPrice" },
  dealer: { label: "Dealer (ডিলার)", short: "Dealer", field: "dealerPrice" },
  subDealer: { label: "Sub Dealer (সাব ডিলার)", short: "Sub Dealer", field: "subDealerPrice" },
  retailer: { label: "Retailer (রিটেইলার)", short: "Retailer", field: "retailerPrice" },
};

export const normalizeCustomerType = (type) =>
  Object.hasOwn(CUSTOMER_TYPES, type) ? type : "retail";

// the extra rates stored on a Product (retail = its sellingPrice)
export const TIER_PRICE_FIELDS = ["purchasePrice", "dealerPrice", "subDealerPrice", "retailerPrice"];

const toPrice = (v) => Math.max(0, Math.round((Number(v) || 0) * 100) / 100);

// rates sent by the product forms, sanitised for saving (0 = not set)
export const cleanTierPrices = (payload = {}) =>
  Object.fromEntries(TIER_PRICE_FIELDS.map((f) => [f, toPrice(payload[f])]));

// product document -> form fields ("" instead of 0 so the inputs start empty)
export const tierPricesFromProduct = (product) =>
  Object.fromEntries(TIER_PRICE_FIELDS.map((f) => [f, product?.[f] ? String(product[f]) : ""]));

// All rates of one variant, kept on a POS cart line so the line can be
// re-priced when the customer (and so the customer type) changes
export const ratesFor = (product, variant) => ({
  sellingPrice: Number(variant?.sellingPrice) || Number(product?.sellingPrice) || 0,
  dealerPrice: Number(product?.tierPrices?.dealerPrice) || 0,
  subDealerPrice: Number(product?.tierPrices?.subDealerPrice) || 0,
  retailerPrice: Number(product?.tierPrices?.retailerPrice) || 0,
});

// The rate a customer type pays. A rate that is not set falls back to the
// normal selling price, so nobody is ever charged 0.
export const rateForType = (rates, type) => {
  const retail = Number(rates?.sellingPrice) || 0;
  const field = CUSTOMER_TYPES[normalizeCustomerType(type)].field;
  return Number(rates?.[field]) || retail;
};
