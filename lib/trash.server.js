import BrandModel from "@/models/Brand.model";
import ColorModel from "@/models/ColorModel";
import CategoryModel from "@/models/category.model";
import ProductModel from "@/models/Product.model";
import ProductVariantModel from "@/models/ProductVariant.model ";
import SubCategoryModel from "@/models/subcategory.model";
import SupplierModel from "@/models/Supplier.model";
import CustomerModel from "@/models/Customer.model";
import UnitModel from "@/models/Unit.model";

import { TRASH_RETENTION_DAYS, TRASH_TABS } from "@/lib/trash";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Everything the trash screen can hold.
 *
 * Deleting anywhere in the admin only stamps `deletedAt`, so one shared
 * registry is enough: the list, the restore, the permanent delete and the
 * 30 day sweep all read these entries instead of each screen wiring up its
 * own endpoints.
 *
 * `select` is what the table shows, `search` the fields the box looks in,
 * and `row` turns a document into the two lines every tab renders.
 */
const TYPES = {
  product: {
    model: () => ProductModel,
    select: "name slug brand deletedAt",
    search: ["name", "slug", "brand"],
    row: (doc) => ({
      title: doc.name,
      subtitle: [doc.brand, doc.slug].filter(Boolean).join(" · "),
    }),
  },

  category: {
    model: () => CategoryModel,
    branchField: "showroomId",
    select: "name slug showroomId deletedAt",
    search: ["name", "slug"],
    row: (doc) => ({ title: doc.name, subtitle: doc.slug }),
  },

  subcategory: {
    model: () => SubCategoryModel,
    select: "name slug deletedAt",
    search: ["name", "slug"],
    row: (doc) => ({ title: doc.name, subtitle: doc.slug }),
  },

  brand: {
    model: () => BrandModel,
    branchField: "showroomId",
    select: "name slug showroomId deletedAt",
    search: ["name", "slug"],
    row: (doc) => ({ title: doc.name, subtitle: doc.slug }),
  },

  "product-variant": {
    model: () => ProductVariantModel,
    select: "sku color size deletedAt",
    search: ["sku", "color", "size"],
    row: (doc) => ({
      title: doc.sku || "Variant",
      subtitle: [doc.color, doc.size].filter(Boolean).join(" · "),
    }),
  },

  unit: {
    model: () => UnitModel,
    select: "name shortName deletedAt",
    search: ["name", "shortName"],
    row: (doc) => ({ title: doc.name, subtitle: doc.shortName }),
  },

  color: {
    model: () => ColorModel,
    select: "name deletedAt",
    search: ["name"],
    row: (doc) => ({ title: doc.name, subtitle: "" }),
  },

  supplier: {
    model: () => SupplierModel,
    branchField: "showroomId",
    select: "name companyName phone deletedAt",
    search: ["name", "companyName", "phone"],
    row: (doc) => ({
      title: doc.name,
      subtitle: [doc.companyName, doc.phone].filter(Boolean).join(" · "),
    }),
  },

  customer: {
    model: () => CustomerModel,
    select: "name businessName phone deletedAt",
    search: ["name", "businessName", "phone"],
    row: (doc) => ({
      title: doc.name,
      subtitle: [doc.businessName, doc.phone].filter(Boolean).join(" · "),
    }),
  },
};

export const TRASH_TYPES = TYPES;

export const trashType = (key) =>
  // only keys the screen offers, so a stray ?type= cannot reach a model
  TRASH_TABS.some((tab) => tab.key === key) ? TYPES[key] : null;

/**
 * The branch switch at the top, as a filter.
 *
 * Only the rows that belong to a shop can be scoped. Products, units and
 * the rest have no owner in this schema, so every shop shares one trash
 * for them and this returns nothing to add. Rows saved before shops
 * existed count as the warehouse's, the same as on the live lists.
 */
export const branchFilter = (type, branch) => {
  const field = type?.branchField;

  if (!field || !branch || branch === "all") return {};

  if (branch === "warehouse") return { [field]: { $in: ["warehouse", null, ""] } };

  return { [field]: branch };
};

/**
 * Wipes everything that has sat in the trash past the retention window.
 *
 * Safe to call as often as you like — the cut-off is worked out fresh each
 * time, so a second run straight after the first finds nothing to do.
 */
export async function purgeExpiredTrash() {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * DAY);
  const removed = {};

  for (const [key, type] of Object.entries(TYPES)) {
    const result = await type
      .model()
      .deleteMany({ ...(type.filter || {}), deletedAt: { $ne: null, $lte: cutoff } });

    if (result.deletedCount) removed[key] = result.deletedCount;
  }

  return { cutoff, removed, total: Object.values(removed).reduce((sum, n) => sum + n, 0) };
}
