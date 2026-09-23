// Price list of a product, one rate per kind of buyer.
// Example: purchase 600 · dealer 700 · sub dealer 750 · retailer 800 · retail 1000
// A customer's `type` picks which rate the POS charges them.

export const CUSTOMER_TYPES = {
  retail: { label: "Buyer / Retail (খুচরা)", short: "Buyer", field: "sellingPrice" },
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

// Dealer / sub dealer / retailer logins (each linked to a Customer of that type)
export const PARTNER_ROLES = ["dealer", "subDealer", "retailer"];
export const isPartnerRole = (role) => PARTNER_ROLES.includes(role);

// A product's tier rates are set against its base selling price. A dearer
// variant (e.g. 256GB) gets the same ratio, so a dealer never pays the
// 128GB rate for a 256GB phone. 0 = rate not set.
export const tierRateForVariant = (product, variant, field) => {
  const tier =
    Number(product?.[field]) || Number(product?.tierPrices?.[field]) || 0;
  if (!tier) return 0;
  const base = Number(product?.sellingPrice) || 0;
  const price = Number(variant?.sellingPrice) || base;
  if (!base || price === base) return tier;
  return Math.round((price * tier) / base);
};

// All rates of one variant, kept on a POS cart line so the line can be
// re-priced when the customer (and so the customer type) changes
export const ratesFor = (product, variant) => ({
  sellingPrice: Number(variant?.sellingPrice) || Number(product?.sellingPrice) || 0,
  dealerPrice: tierRateForVariant(product, variant, "dealerPrice"),
  subDealerPrice: tierRateForVariant(product, variant, "subDealerPrice"),
  retailerPrice: tierRateForVariant(product, variant, "retailerPrice"),
});

// the one price a partner of `type` pays for this variant
export const partnerPrice = (product, variant, type) =>
  rateForType(ratesFor(product, variant), type);

// The rate a customer type pays. A rate that is not set falls back to the
// normal selling price, so nobody is ever charged 0.
export const rateForType = (rates, type) => {
  const retail = Number(rates?.sellingPrice) || 0;
  const field = CUSTOMER_TYPES[normalizeCustomerType(type)].field;
  return Number(rates?.[field]) || retail;
};
