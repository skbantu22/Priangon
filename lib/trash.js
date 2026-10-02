/**
 * Shared trash settings — safe for both the browser and the server.
 *
 * The model wiring lives in lib/trash.server.js; importing that from a
 * client screen would drag mongoose into the bundle.
 */

/** A deleted row waits this long in the trash before it is wiped for good */
export const TRASH_RETENTION_DAYS = 30;

const DAY = 24 * 60 * 60 * 1000;

/**
 * Tabs on the trash screen, in the order they are shown.
 *
 * `scoped` marks the tabs whose rows belong to one shop, so the branch
 * switch at the top filters them the way it filters the live list. The
 * rest are shared by every shop in this schema — one product list, one
 * unit list — and the screen says so rather than quietly showing a
 * warehouse row inside a showroom.
 */
export const TRASH_TABS = [
  { key: "product", label: "Products" },
  { key: "category", label: "Categories", scoped: true },
  { key: "subcategory", label: "Sub Categories" },
  { key: "brand", label: "Brands", scoped: true },
  { key: "product-variant", label: "Product Variants" },
  { key: "unit", label: "Units" },
  { key: "color", label: "Colors" },
  { key: "supplier", label: "Suppliers", scoped: true },
  { key: "customer", label: "Customers" },
];

export const trashTab = (key) => TRASH_TABS.find((tab) => tab.key === key) || null;

/** The moment a row deleted at `deletedAt` gets wiped */
export const purgeAt = (deletedAt) =>
  deletedAt ? new Date(new Date(deletedAt).getTime() + TRASH_RETENTION_DAYS * DAY) : null;

/** Whole days left before a row is wiped, never below zero */
export const daysLeft = (deletedAt) => {
  const due = purgeAt(deletedAt);
  if (!due) return TRASH_RETENTION_DAYS;

  return Math.max(0, Math.ceil((due.getTime() - Date.now()) / DAY));
};
