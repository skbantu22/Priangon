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
  search,
  showroomId,
  categoryId,
  brand,
  sort,
  currentUser?._id,
  currentUser?.role,
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
    return { items: [], page: 1, limit: 20, total: 0, hasMore: false };

  const params = new URLSearchParams();
  params.set("page", pageParam.toString());
  params.set("limit", "20");

  if (search) params.set("q", search);
  if (categoryId) params.set("categoryId", categoryId);
  if (brand) params.set("brand", brand);
  if (sort) params.set("sort", sort);

  // single store: the resolved store is used for every role
  const showroomId = selectedShowroomId || (currentUser?.role === "admin" ? "" : currentUser?.showroomId);

  if (!showroomId) {
    params.set("showroomId", "all");
  } else if (showroomId) {
    params.set("showroomId", showroomId);
  }

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
      const productVariants = variants.map((v) => ({
        ...v,
        stock: v.showroomStock || 0,
        showroomStock: v.showroomStock || 0,
        sellingPrice: v.sellingPrice || productId.sellingPrice || 0,
        image: v.image || productId.image || "/placeholder.png",
      }));

      return {
        _id: productId._id || _id,
        name: productId.name,
        brand: productId.brand || "",
        category: productId.category ? String(productId.category) : "",
        warranty: productId.warranty || { type: "none", months: 0 },
        trackSerial: !!productId.trackSerial,
        image: productId.image,
        sellingPrice: productId.sellingPrice,
        tierPrices: productId.tierPrices || {},
        variants: productVariants,
        media: productId.image ? [{ secure_url: productId.image }] : [],
        totalStock: productVariants.reduce((a, b) => a + b.stock, 0),
      };
    },
  );

  return {
    items: formatted,
    page: resData.page || pageParam,
    limit: resData.limit || 20,
    total: resData.total || 0,
    hasMore: resData.hasMore ?? false,
  };
};

export const posBrandsQueryOptions = () => ({
  queryKey: ["pos-brands"],
  queryFn: async () => {
    const res = await fetch("/api/pos/brands");
    const data = await res.json();
    return data.brands || [];
  },
  staleTime: 1000 * 60 * 5,
});

// filters: { search, showroomId, categoryId, brand, sort, currentUser }
export const posProductsQueryOptions = (filters) => ({
  queryKey: posProductsQueryKey(filters),
  queryFn: ({ pageParam }) => fetchPosProductsPage({ pageParam, ...filters }),
  initialPageParam: 1,
  getNextPageParam: (lastPage) =>
    lastPage.hasMore ? lastPage.page + 1 : undefined,
  staleTime: 1000 * 60 * 3,
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

export const posCategoriesQueryOptions = () => ({
  queryKey: ["pos-categories"],
  queryFn: async () => {
    const res = await fetch("/api/category");
    const data = await res.json();
    return data.categories || data.data || [];
  },
  staleTime: 1000 * 60 * 5,
});

// Admin's last picked showroom, remembered on this device so the POS (and its
// prefetch) can ask for the right product list straight away
const POS_SHOWROOM_KEY = "pos-showroom";

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
};

// The showroom the POS sells from: cashier/manager are fixed to theirs, an admin
// uses the picked one, else the remembered one, else the first showroom
// Single store: everyone (admin and cashier) sells from the one store, the
// first one set up. /api/showrooms lists newest first, so it is the last.
// (currentUser / picked are kept in the signature for older callers.)
export const resolvePosShowroomId = ({ currentUser, picked, showrooms = [] }) =>
  showrooms.at(-1)?._id || "";

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
  { search = "", categoryId = "", brand = "", sort = "latest" },
) => {
  const q = search.trim().toLowerCase();
  const b = brand.trim().toLowerCase();

  const list = products.filter((p) => {
    if (categoryId && categoryId !== "all" && p.category !== categoryId) return false;
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
