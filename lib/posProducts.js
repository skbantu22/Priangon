import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";

// Shared by the POS page and the background prefetch (PosPrefetch),
// so both read/write the very same React Query cache entries.

export const POS_ROLES = ["admin", "cashier", "manager"];

export const getPosCurrentUser = (auth) =>
  auth?.data?.user || auth?.user || auth;

export const posProductsQueryKey = ({
  search = "",
  showroomId = "",
  categoryId = "",
  brand = "",
  sort = "latest",
  currentUser,
}) => [
  "pos-products",
  "shop-only",
  search,
  showroomId,
  categoryId,
  brand,
  sort,
  currentUser?._id,
  currentUser?.role,
  currentUser?.posTill,
];

const fetchPosProductsPage = async ({
  pageParam = 1,
  search = "",
  showroomId: selectedShowroomId = "",
  categoryId = "",
  brand = "",
  sort = "latest",
  currentUser,
}) => {
  if (!currentUser)
    return { items: [], page: 1, limit: 24, total: 0, hasMore: false };

  const params = new URLSearchParams();
  params.set("page", pageParam.toString());
  params.set("limit", "24");

  if (!/^[a-f\d]{24}$/i.test(String(selectedShowroomId || ""))) {
    return { items: [], page: 1, limit: 24, total: 0, hasMore: false };
  }

  if (search) params.set("q", search);
  if (categoryId) params.set("categoryId", categoryId);
  if (brand) params.set("brand", brand);
  if (sort) params.set("sort", sort);

  params.set("showroomId", String(selectedShowroomId));

  const res = await fetch(`/api/pos?${params.toString()}`, {
    method: "GET",
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
    cache: "no-store",
  });

  const resData = await res.json().catch(() => ({}));

  // A failed response must throw: otherwise React Query caches it as an
  // "empty product list" (and persists it) instead of retrying
  if (!res.ok || resData.success === false) {
    throw new Error(
      resData.message || `POS products request failed (${res.status})`,
    );
  }

  const formatted = (resData.items ?? []).map(
    ({ productId = {}, variants = [], _id }) => {
      const productVariants = variants
        .map((v) => ({
          ...v,
          stock: Number(v.showroomStock) || 0,
          showroomStock: Number(v.showroomStock) || 0,
          sellingPrice: v.sellingPrice || productId.sellingPrice || 0,
          image: v.image || productId.image || "/placeholder.png",
        }))
        .filter((v) => v.showroomStock > 0);

      if (!productVariants.length) return null;

      return {
        _id: productId._id || _id,
        name: productId.name,
        brand: productId.brand || "",
        category: productId.category ? String(productId.category) : "",
        subcategory: productId.subcategory ? String(productId.subcategory) : "",
        warranty: productId.warranty || { type: "none", months: 0 },
        trackSerial: !!productId.trackSerial,
        image: productId.image,
        sellingPrice: productId.sellingPrice,
        tierPrices: productId.tierPrices || {},
        variants: productVariants,
        media: productId.image ? [{ secure_url: productId.image }] : [],
        totalStock: productVariants.reduce((a, b) => a + b.stock, 0),
      };
    })
    .filter(Boolean);

  return {
    items: formatted,
    page: resData.page || pageParam,
    limit: resData.limit || 24,
    total: resData.total || 0,
    hasMore: resData.hasMore ?? false,
  };
};

const fetchTillCatalog = async (showroomId) => {
  const id = String(showroomId || "");
  if (!id) return { brands: [], categories: [], subcategories: [] };

  const res = await fetch(`/api/pos/catalog?showroomId=${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || "Could not load this showroom's catalog");
  }
  return {
    brands: data.brands || [],
    categories: data.categories || [],
    subcategories: data.subcategories || [],
  };
};

/** Brands, categories, and subcategories that have stock at this till. */
export const posCatalogQueryOptions = (showroomId = "") => ({
  queryKey: ["pos-till-catalog", showroomId || "none"],
  queryFn: () => fetchTillCatalog(showroomId),
  staleTime: 0,
});

export const posBrandsQueryOptions = (showroomId = "") => ({
  // "till" is part of the key so a persisted global brand list cannot paint
  // after the showroom changes.
  queryKey: ["pos-brands", "till", showroomId || "catalog"],
  queryFn: async () => {
    if (showroomId) return (await fetchTillCatalog(showroomId)).brands;
    // Add Product suggestions: the master brand list, not a till.
    const res = await fetch("/api/pos/brands");
    const data = await res.json().catch(() => ({}));
    return data.brands || [];
  },
  staleTime: showroomId ? 0 : 1000 * 60 * 5,
});

// filters: { search, showroomId, categoryId, brand, sort, currentUser }
export const posProductsQueryOptions = (filters) => ({
  queryKey: posProductsQueryKey(filters),
  queryFn: ({ pageParam }) => fetchPosProductsPage({ pageParam, ...filters }),
  initialPageParam: 1,
  getNextPageParam: (lastPage) =>
    lastPage.hasMore ? lastPage.page + 1 : undefined,
  // stock changes from purchases and sales; a saved list must not keep
  // showing "Out of stock" after the shelf has quantity
  staleTime: 0,
});

export const posShowroomsQueryOptions = () => ({
  queryKey: ["pos-showrooms"],
  queryFn: async () => {
    const res = await fetch("/api/showrooms");
    const data = await res.json();
    return data.showrooms || [];
  },
  staleTime: 1000 * 60 * 5,
});

export const posCategoriesQueryOptions = (showroomId = "") => ({
  queryKey: ["pos-categories", "till", showroomId || "none"],
  queryFn: async () => {
    if (!showroomId) return [];
    return (await fetchTillCatalog(showroomId)).categories;
  },
  staleTime: 0,
});

// Admin's last picked showroom, remembered on this device so the POS (and its
// prefetch) can ask for the right product list straight away
const POS_SHOWROOM_KEY = "pos-till";
const showroomListeners = new Set();

export const readPosShowroom = () => {
  try {
    return localStorage.getItem(POS_SHOWROOM_KEY) || "";
  } catch {
    return "";
  }
};

export const writePosShowroom = (id) => {
  try {
    if (id) localStorage.setItem(POS_SHOWROOM_KEY, id);
    else localStorage.removeItem(POS_SHOWROOM_KEY);
  } catch {
    // storage blocked: the pick still works for this session
  }
  showroomListeners.forEach((listener) => listener());
};

export const subscribePosShowroom = (listener) => {
  showroomListeners.add(listener);
  return () => showroomListeners.delete(listener);
};

export const WAREHOUSE_TILL = "warehouse";

export const usePosShowroomId = () =>
  useSyncExternalStore(subscribePosShowroom, readPosShowroom, () => "");

export const resolvePosShowroomId = ({ currentUser, picked, showrooms = [] }) => {
  const centers = showrooms.filter((s) => s?._id && s.isSaleCenter === true);
  const active = showrooms.filter((s) => s?._id && s.isActive !== false);
  const list = centers.length ? centers : active.length ? active : showrooms.filter((s) => s?._id);
  list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  return list[0]?._id ? String(list[0]._id) : "";
};

/** POS till. Only an admin follows the dropdown. Everyone else stays on
 * the branch of their login, whatever this device last remembered. */
export const resolvePosTill = ({ picked, showrooms = [], currentUser } = {}) => {
  if (currentUser && currentUser.role !== "admin") {
    if (currentUser.showroomId) return String(currentUser.showroomId);
    return resolvePosShowroomId({ showrooms }) || "";
  }

  const active = showrooms.filter((s) => s?._id && s.isActive !== false);
  const chosen = active.find((s) => String(s._id) === String(picked));
  if (chosen) return String(chosen._id);
  // A picked branch id is the till even before the branch list has loaded.
  // Dropping it used to send that showroom's new stock to the warehouse.
  if (/^[a-f\d]{24}$/i.test(String(picked || ""))) return String(picked);

  // The old "warehouse" pick was an extra row, not a shop. Admin stays on a real branch.
  return resolvePosShowroomId({ showrooms });
};

/** The branch the POS is selling from. Opening stock is written here so a
 * new product shows on that till. */
export function useOpeningStockTill() {
  const picked = usePosShowroomId();
  const { data: showrooms = [] } = useQuery(posShowroomsQueryOptions());
  const auth = useSelector((state) => state.authStore.auth);
  const currentUser = getPosCurrentUser(auth);
  const id = resolvePosTill({ picked, showrooms, currentUser });
  if (!id || id === WAREHOUSE_TILL) return { id: WAREHOUSE_TILL, name: "Warehouse" };
  const branch = showrooms.find((s) => String(s._id) === String(id));
  return { id, name: branch?.name || "Sale Center" };
}

const byId = (a, b) => (String(a._id) < String(b._id) ? -1 : String(a._id) > String(b._id) ? 1 : 0);

const sorters = {
  latest: (a, b) => byId(b, a),
  oldest: byId,
  "price-asc": (a, b) => (a.sellingPrice || 0) - (b.sellingPrice || 0) || byId(a, b),
  "price-desc": (a, b) => (b.sellingPrice || 0) - (a.sellingPrice || 0) || byId(a, b),
  name: (a, b) => String(a.name || "").localeCompare(String(b.name || "")) || byId(a, b),
};

// Same rules as GET /api/pos, applied to the already loaded list, so search,
// category, brand and sort answer instantly without a server round trip
export const filterPosProducts = (
  products,
  { search = "", categoryId = "", subcategoryId = "", brand = "", sort = "latest" },
) => {
  const q = search.trim().toLowerCase();
  const b = brand.trim().toLowerCase();

  const list = products.filter((p) => {
    if (categoryId && categoryId !== "all" && p.category !== categoryId) return false;
    if (
      subcategoryId &&
      subcategoryId !== "all" &&
      String(p.subcategory || "") !== String(subcategoryId)
    )
      return false;
    if (b && String(p.brand || "").toLowerCase() !== b) return false;
    if (!q) return true;
    if (String(p.name || "").toLowerCase().includes(q)) return true;
    return p.variants.some(
      (v) =>
        String(v.barcode || "").toLowerCase().includes(q) ||
        String(v.sku || "").toLowerCase().includes(q),
    );
  });

  return list.sort(sorters[sort] || sorters.latest);
};
