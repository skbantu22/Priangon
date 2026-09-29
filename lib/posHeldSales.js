/** Parked POS carts (hold). Stock is not deducted until checkout. */

export const HELD_SALES_KEY = "pos-held-sales";

export function readAllHeldSales() {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(HELD_SALES_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function writeAllHeldSales(list) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HELD_SALES_KEY, JSON.stringify(list));
  } catch {
    // quota / private mode
  }
}

/** Holds visible only for the active shop (top branch switch). */
export function heldSalesForShop(all, showroomId) {
  const shop = String(showroomId || "");
  if (!/^[a-f\d]{24}$/i.test(shop)) return [];
  return (all || []).filter((h) => String(h.showroomId || "") === shop);
}

export function buildHoldEntry({
  showroomId,
  cart,
  total,
  discountType,
  discountValue,
  vatType,
  vatValue,
  customer,
  label = "",
}) {
  const hasCustomer =
    customer &&
    (customer._id || String(customer.name || "").trim() || String(customer.phone || "").trim());

  return {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    showroomId: String(showroomId),
    label: String(label || "").trim(),
    cart,
    total,
    discountType,
    discountValue,
    vatType,
    vatValue,
    customer: hasCustomer ? customer : null,
  };
}

export function holdDisplayTitle(h) {
  if (h?.customer?.name) return h.customer.name;
  if (h?.label) return h.label;
  return "Walk-in hold";
}

/** Node/tests: same filter without localStorage */
export function filterHeldByShop(entries, showroomId) {
  return heldSalesForShop(entries, showroomId);
}
