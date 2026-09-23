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

  const showroomId =
    currentUser?.role === "admin"
      ? selectedShowroomId
      : currentUser?.showroomId;

  if (currentUser?.role === "admin" && !selectedShowroomId) {
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
        warranty: productId.warranty || { type: "none", months: 0 },
        trackSerial: !!productId.trackSerial,
        image: productId.image,
        sellingPrice: productId.sellingPrice,
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
