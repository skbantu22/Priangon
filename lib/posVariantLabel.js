const real = (x) =>
  x && !/^(default|standard|n\/a)$/i.test(String(x).trim()) ? String(x).trim() : "";

/** Human label for a variant row in the picker and cart (e.g. "1kg", "Red · XL"). */
export function variantDisplayName(variant) {
  if (!variant) return "";
  const parts = [real(variant.size), real(variant.color)].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  if (variant.sku) return String(variant.sku);
  return "";
}

export function cartLineTitle(productName, variant) {
  const label = variantDisplayName(variant);
  if (!label) return productName || "Product";
  const base = String(productName || "").trim();
  if (base.toLowerCase().includes(label.toLowerCase())) return base;
  return `${base} ${label}`.trim();
}

export const variantStockAtShop = (v) =>
  Number(v?.showroomStock ?? v?.stock ?? 0);
