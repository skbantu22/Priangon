// Unit / type / codes / stock-alert fields of a product (add & edit forms),
// sanitised for saving on a Product

export const PRODUCT_UNITS = ["Pcs", "Box", "Set", "Pair", "Pack", "Dozen", "Kg", "Gram", "Ltr", "Meter"];

export const PRODUCT_TYPES = {
  simple: { label: "Simple Product", hint: "One item, no colors / sizes (charger, cable, case...)" },
  variant: { label: "Variant Product", hint: "Has colors / storage / sizes (phones, watches...)" },
};

const num = (v, max = 1e9) => Math.max(0, Math.min(max, Number(v) || 0));
const text = (v, max = 60) => String(v || "").trim().slice(0, max);

export const cleanExtraFields = (payload = {}) => ({
  productType: Object.hasOwn(PRODUCT_TYPES, payload.productType) ? payload.productType : "variant",
  unit: text(payload.unit, 20) || "Pcs",
  code: text(payload.code, 40),
  rackNo: text(payload.rackNo, 30),
  weight: num(payload.weight, 1e6),
  alertQuantity: Math.round(num(payload.alertQuantity, 1e6)),
  minSalePrice: num(payload.minSalePrice),
  vatGroup: /^[a-f\d]{24}$/i.test(String(payload.vatGroup || "")) ? payload.vatGroup : null,
  showInWebsite: payload.showInWebsite !== false && payload.showInWebsite !== "false",
});

// product document -> form fields ("" instead of 0 so the inputs start empty)
export const extraFieldsFromProduct = (product) => ({
  productType: product?.productType || "variant",
  unit: product?.unit || "Pcs",
  code: product?.code || "",
  rackNo: product?.rackNo || "",
  weight: product?.weight ? String(product.weight) : "",
  alertQuantity: product?.alertQuantity ? String(product.alertQuantity) : "",
  minSalePrice: product?.minSalePrice ? String(product.minSalePrice) : "",
  vatGroup: product?.vatGroup ? String(product.vatGroup._id || product.vatGroup) : "",
  showInWebsite: product?.showInWebsite ?? true,
});
