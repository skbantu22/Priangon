import Image from "next/image";
import { skipOptimize } from "@/lib/imageSrc";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  PackageSearch,
  Search,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from "lucide-react";
import BrandLogo from "./BrandLogo";
import { formatWarrantyPeriod } from "@/lib/warranty";

const LOW_STOCK = 5;

// ---------------- HELPER: SAFE PRODUCT DATA PARSER ----------------
// 🚀 ফাঁকা productId ({}) বা রুট লেভেল ডাটা হ্যান্ডেল করার ফাংশন
export const getParsedProduct = (item) => {
  const hasValidProductId =
    item?.productId &&
    typeof item.productId === "object" &&
    Object.keys(item.productId).length > 0;

  const p = hasValidProductId ? item.productId : item;
  const variants = item?.variants?.length ? item.variants : p?.variants || [];

  // ইমেজের ক্লাউডিনারি ও নরমাল ফিল্ড হ্যান্ডলিং
  let imageUrl = "/placeholder.png";
  if (item?.image) imageUrl = item.image;
  else if (p?.image) imageUrl = p.image;
  else if (Array.isArray(p?.media) && p.media.length > 0) {
    imageUrl = p.media[0]?.secure_url || p.media[0] || "/placeholder.png";
  }

  return {
    _id: p?._id || item?._id,
    name: p?.name || item?.name || "Unnamed Product",
    brand: p?.brand || item?.brand || "",
    warranty: p?.warranty || null,
    variants,
    imageUrl,
    rawItem: item,
    rawProduct: p,
  };
};

const variantStock = (v) => Number(v.showroomStock ?? v.stock ?? 0);

export const findByBarcode = (products, code) => {
  for (const item of products || []) {
    const parsed = getParsedProduct(item);
    const variant = parsed.variants.find((v) => String(v.barcode) === code);
    if (variant) return { product: parsed.rawProduct, variant };
  }
  return null;
};

const summarize = (item) => {
  const parsed = getParsedProduct(item);
  const { variants } = parsed;
  const stock = variants.reduce((sum, v) => sum + variantStock(v), 0);
  const prices = variants
    .map((v) => Number(v.sellingPrice || 0))
    .filter((p) => p > 0);
  return {
    ...parsed,
    stock,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    options: [...new Set(variants.map((v) => v.size).filter(Boolean))],
  };
};

const stockLabel = (stock) =>
  stock <= 0
    ? ["Out of stock", "text-red-500"]
    : stock <= LOW_STOCK
      ? [`Low Stock (${stock})`, "text-amber-600"]
      : [`In Stock (${stock})`, "text-emerald-600"];

// Horizontal chip row with ‹ › buttons that only show when there is more to see
function ScrollRow({ label, children }) {
  const rowRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const measure = () => {
    const el = rowRef.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  };

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // chips arrive later (brands / categories load async): re-check the edges
  useEffect(() => {
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [children]);

  const scroll = (dir) =>
    rowRef.current?.scrollBy({
      left: dir * rowRef.current.clientWidth * 0.7,
      behavior: "smooth",
    });

  const arrow =
    "absolute z-10 flex size-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md hover:text-primary dark:border-white/10 dark:bg-card";

  return (
    <div className="relative flex shrink-0 items-center">
      {!edges.start && (
        <>
          <div className="pointer-events-none absolute left-0 z-5 h-full w-12 bg-linear-to-r from-background to-transparent" />
          <button type="button" onClick={() => scroll(-1)} className={`${arrow} left-0`} title={`Previous ${label}`}>
            <ChevronLeft className="size-4" />
          </button>
        </>
      )}
      <div
        ref={rowRef}
        onScroll={measure}
        className="flex gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none]"
      >
        {children}
      </div>
      {!edges.end && (
        <>
          <div className="pointer-events-none absolute right-0 z-5 h-full w-12 bg-linear-to-l from-background to-transparent" />
          <button type="button" onClick={() => scroll(1)} className={`${arrow} right-0`} title={`More ${label}`}>
            <ChevronRight className="size-4" />
          </button>
        </>
      )}
    </div>
  );
}

function AddButton({ disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Add to cart"
      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-md shadow-primary/30 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
    >
      <Plus className="size-4" strokeWidth={3} />
    </button>
  );
}

function ProductItem({ item, view, setOpenProduct, addToCart }) {
  const { name, brand, warranty, variants, imageUrl, rawProduct, stock, minPrice, maxPrice, options } =
    summarize(item);
  const [label, labelClass] = stockLabel(stock);
  const warrantyText =
    warranty?.type && warranty.type !== "none" && warranty.months
      ? `${formatWarrantyPeriod(warranty.months)} warranty`
      : "";

  const handleAdd = (e) => {
    e.stopPropagation();
    const inStock = variants.filter((v) => variantStock(v) > 0);
    // a single variant goes straight in, otherwise let the cashier pick
    if (variants.length === 1 && inStock.length === 1) {
      addToCart(rawProduct, inStock[0], 1);
    } else {
      setOpenProduct(item);
    }
  };

  const price = (
    <p className="truncate text-[17px] font-bold text-primary">
      ৳ {minPrice.toLocaleString()}
      {maxPrice > minPrice && (
        <span className="text-[12px] font-normal text-primary/70">
          {" "}
          – {maxPrice.toLocaleString()}
        </span>
      )}
    </p>
  );

  const image = (className, sizes) => (
    <div className={`relative overflow-hidden rounded-lg bg-linear-to-b from-violet-50 to-white dark:from-white/5 dark:to-transparent ${className}`}>
      <Image
        src={imageUrl}
        alt={name}
        fill
        sizes={sizes}
        className="object-contain p-2 transition duration-300 group-hover:scale-105"
        unoptimized={skipOptimize(imageUrl)}
      />
    </div>
  );

  if (view === "list") {
    return (
      <div
        onClick={() => setOpenProduct(item)}
        className="group flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 pr-3 transition hover:border-primary/40 hover:shadow-md dark:border-white/10 dark:bg-card"
      >
        {image("size-14 shrink-0", "56px")}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {name}
          </h3>
          <p className="line-clamp-1 text-[11px] text-gray-400">
            {[brand, options.slice(0, 4).join(" · "), warrantyText]
              .filter(Boolean)
              .join(" — ")}
          </p>
        </div>
        <div className="w-32 text-right">
          {price}
          <p className={`text-[11px] font-normal ${labelClass}`}>{label}</p>
        </div>
        <AddButton disabled={stock <= 0} onClick={handleAdd} />
      </div>
    );
  }

  return (
    <div
      onClick={() => setOpenProduct(item)}
      className="group relative flex cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 dark:border-white/10 dark:bg-card"
    >
      {variants.length > 1 && (
        <span className="absolute right-2 top-2 z-10 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          {variants.length} options
        </span>
      )}

      {image("aspect-square w-full", "(max-width: 1280px) 25vw, 15vw")}

      {warrantyText && (
        <span className="absolute left-2 top-2 z-10 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          🛡 {warrantyText}
        </span>
      )}

      {brand && (
        <p className="mt-2 truncate text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {brand}
        </p>
      )}
      <h3
        title={name}
        className={`line-clamp-2 min-h-10 text-[14px] font-semibold leading-5 text-gray-900 dark:text-gray-100 ${brand ? "" : "mt-2"}`}
      >
        {name}
      </h3>

      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {price}
          <p className={`mt-0.5 text-[12px] font-medium ${labelClass}`}>
            {label}
          </p>
        </div>
        <AddButton disabled={stock <= 0} onClick={handleAdd} />
      </div>
    </div>
  );
}

export default function ProductGallery({
  products = [],
  loading,
  isError = false,
  onRetry,
  search,
  setSearch,
  setOpenProduct,
  addToCart,
  inputRef,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  categories = [],
  selectedCategoryId,
  setSelectedCategoryId,
  brands = [],
  selectedBrand,
  setSelectedBrand,
  sort,
  setSort,
}) {
  const typingTimeout = useRef(null);
  const focusLock = useRef(false);
  const loaderRef = useRef(null);
  const scrollRef = useRef(null);

  // quick filter over the loaded list (the top bar search goes to the server)
  const [localFilter, setLocalFilter] = useState("");
  const [view, setView] = useState("grid");

  const visibleProducts = useMemo(() => {
    const term = localFilter.trim().toLowerCase();
    if (!term) return products;
    return products.filter((item) => {
      const { name, brand, variants } = getParsedProduct(item);
      return (
        name.toLowerCase().includes(term) ||
        brand.toLowerCase().includes(term) ||
        variants.some(
          (v) =>
            String(v.sku || "").toLowerCase().includes(term) ||
            String(v.barcode || "").includes(term),
        )
      );
    });
  }, [products, localFilter]);

  const hasProducts = visibleProducts.length > 0;

  // ---------------- PRE-FETCH INFINITE SCROLL ----------------
  // The loader element only exists while the grid is rendered, so the observer
  // must also re-attach when loading / error / hasProducts change. Otherwise it
  // is never attached when data is already cached and hasNextPage doesn't change.
  useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: scrollRef.current,
        threshold: 0,
        rootMargin: "500px",
      },
    );

    observer.observe(loaderRef.current);

    return () => observer.disconnect();
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    loading,
    isError,
    hasProducts,
  ]);

  // ---------------- BARCODE AUTO ADD ----------------
  // Scanners type fast and may not send Enter: add as soon as the typed
  // text matches a barcode exactly.
  useEffect(() => {
    const code = search.trim();
    if (!code) return;

    clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      const found = findByBarcode(products, code);
      if (!found) return;

      addToCart(found.product, found.variant, 1);
      setSearch("");

      if (!focusLock.current) {
        focusLock.current = true;
        requestAnimationFrame(() => inputRef?.current?.focus());

        setTimeout(() => {
          focusLock.current = false;
        }, 100);
      }
    }, 180);

    return () => clearTimeout(typingTimeout.current);
  }, [search, products, addToCart, setSearch, inputRef]);

  const chip = (active) =>
    `flex h-10 shrink-0 items-center rounded-lg border px-4 text-[13px] font-normal transition ${
      active
        ? "border-primary bg-primary text-white shadow-md shadow-primary/30 [&_*]:text-white! [&_span.rounded]:bg-transparent!"
        : "border-gray-200 bg-white text-gray-700 hover:border-primary/50 dark:border-white/10 dark:bg-card dark:text-gray-200"
    }`;

  const selectClass =
    "h-10 min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 outline-none focus:border-primary dark:border-white/10 dark:bg-card dark:text-gray-200";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 p-4">
      {/* ---------------- CATEGORY CHIPS ---------------- */}
      <ScrollRow label="categories">
        <button
          type="button"
          onClick={() => setSelectedCategoryId("")}
          className={chip(!selectedCategoryId)}
        >
          All Products
        </button>
        {categories.map((cat) => (
          <button
            type="button"
            key={cat._id}
            onClick={() => setSelectedCategoryId(cat._id)}
            className={chip(selectedCategoryId === cat._id)}
          >
            {cat.name || cat.title}
          </button>
        ))}
      </ScrollRow>

      {/* ---------------- BRAND CHIPS ---------------- */}
      {brands.length > 0 && (
        <ScrollRow label="brands">
            <button
              type="button"
              onClick={() => setSelectedBrand("")}
              className={chip(!selectedBrand)}
            >
              All Brands
            </button>
            {brands.map((b) => (
              <button
                type="button"
                key={b}
                onClick={() => setSelectedBrand(b)}
                className={chip(selectedBrand === b)}
              >
                <BrandLogo brand={b} />
              </button>
            ))}
        </ScrollRow>
      )}

      {/* ---------------- PRODUCTS PANEL ---------------- */}
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-gray-200/70 bg-white/60 dark:border-white/10 dark:bg-white/[0.02]">
        {/* filter bar */}
        <div className="grid shrink-0 grid-cols-2 gap-2 p-3 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_auto]">
          <label className="col-span-2 flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 focus-within:border-primary md:col-span-1 dark:border-white/10 dark:bg-card">
            <Search className="size-4 text-gray-400" />
            <input
              value={localFilter}
              onChange={(e) => setLocalFilter(e.target.value)}
              placeholder="Search products..."
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
            />
          </label>

          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className={selectClass}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name || cat.title}
              </option>
            ))}
          </select>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className={selectClass}
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className={selectClass}
          >
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name">Name (A–Z)</option>
          </select>

          <div className="flex h-10 overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
            {[
              ["grid", LayoutGrid],
              ["list", List],
            ].map(([key, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                title={key === "grid" ? "Grid view" : "List view"}
                className={`flex w-10 items-center justify-center ${
                  view === key
                    ? "bg-primary text-white"
                    : "bg-white text-gray-400 hover:text-primary dark:bg-card"
                }`}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-3 pb-3"
        >
          {loading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-xl bg-white dark:bg-card"
                />
              ))}
            </div>
          ) : isError && !products.length ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2">
              <p className="text-sm text-red-500">Could not load products.</p>
              <button
                type="button"
                onClick={onRetry}
                className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:brightness-110"
              >
                Retry
              </button>
            </div>
          ) : hasProducts ? (
            <>
              <div
                className={
                  view === "grid"
                    ? "grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3"
                    : "flex flex-col gap-2"
                }
              >
                {visibleProducts.map((item, index) => (
                  <ProductItem
                    key={getParsedProduct(item)._id || index}
                    item={item}
                    view={view}
                    setOpenProduct={setOpenProduct}
                    addToCart={addToCart}
                  />
                ))}
              </div>

              {/* ---------------- INFINITE LOADER TRIGGER ---------------- */}
              <div
                ref={loaderRef}
                className="flex min-h-[40px] items-center justify-center py-4 text-center"
              >
                {isFetchingNextPage ? (
                  <p className="animate-pulse text-xs font-medium text-gray-500">
                    Loading more products...
                  </p>
                ) : hasNextPage ? (
                  <button
                    type="button"
                    onClick={() => fetchNextPage()}
                    className="text-xs text-gray-400 hover:text-primary"
                  >
                    Scroll down or click to load more
                  </button>
                ) : (
                  <p className="text-xs text-gray-400">
                    {visibleProducts.length} products · all loaded
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-gray-400">
              <PackageSearch className="size-10" />
              <p className="text-sm">No products found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
