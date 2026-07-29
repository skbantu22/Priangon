import Image from "next/image";
import { useEffect, useRef, useMemo } from "react";

export default function ProductGallery({
  products = [],
  loading,
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
}) {
  const typingTimeout = useRef(null);
  const focusLock = useRef(false);
  const loaderRef = useRef(null);
  const scrollRef = useRef(null);

  // ---------------- PRE-FETCH INFINITE SCROLL ----------------
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
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // ---------------- KEEP INPUT FOCUS ----------------
  const keepFocus = () => {
    if (inputRef?.current) {
      requestAnimationFrame(() => {
        inputRef.current.focus();
      });
    }
  };

  // ---------------- HELPER: SAFE PRODUCT DATA PARSER ----------------
  // 🚀 ফাঁকা productId ({}) বা রুট লেভেল ডাটা হ্যান্ডেল করার ফাংশন
  const getParsedProduct = (item) => {
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
      variants,
      imageUrl,
      rawItem: item,
      rawProduct: p,
    };
  };

  // ---------------- BARCODE AUTO ADD ----------------
  useEffect(() => {
    const code = search.trim();
    if (!code) return;

    clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      const foundItem = products?.find((item) => {
        const { variants } = getParsedProduct(item);
        return variants.some((v) => String(v.barcode) === code);
      });

      if (!foundItem) return;

      const parsed = getParsedProduct(foundItem);
      const variant = parsed.variants.find((v) => String(v.barcode) === code);

      if (variant) {
        addToCart(parsed.rawProduct, variant, 1);
        setSearch("");

        if (!focusLock.current) {
          focusLock.current = true;
          keepFocus();

          setTimeout(() => {
            focusLock.current = false;
          }, 100);
        }
      }
    }, 180);

    return () => clearTimeout(typingTimeout.current);
  }, [search, products, addToCart, setSearch]);

  // ---------------- ENTER KEY ----------------
  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;

    const code = search.trim();

    const foundItem = products?.find((item) => {
      const { variants } = getParsedProduct(item);
      return variants.some((v) => String(v.barcode) === code);
    });

    if (!foundItem) return;

    const parsed = getParsedProduct(foundItem);
    const variant = parsed.variants.find((v) => String(v.barcode) === code);

    if (variant) {
      addToCart(parsed.rawProduct, variant, 1);
      setSearch("");
      keepFocus();
    }
  };

  return (
    <div
      ref={scrollRef}
      className="lg:col-span-6 bg-[#eef1f5] p-2 overflow-y-auto h-full min-h-0 scroll-smooth"
    >
      {/* ---------------- SEARCH + CATEGORY ---------------- */}
      <div className="sticky top-0 z-10 mb-2 bg-white border border-gray-200 rounded p-1.5 flex flex-col sm:flex-row gap-2 shadow-sm">
        <input
          ref={inputRef}
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search or Scan Barcode..."
          className="flex-1 h-8 px-2.5 border border-gray-300 rounded text-xs outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
        />

        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="w-full sm:w-48 h-8 px-2 border border-gray-300 rounded text-xs outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-white"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name || cat.title}
            </option>
          ))}
        </select>
      </div>

      {/* ---------------- LOADING ---------------- */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 text-xs">Loading products...</p>
        </div>
      ) : products?.length > 0 ? (
        <>
          {/* ---------------- PRODUCT GRID ---------------- */}
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-1.5">
            {products.map((item, index) => {
              const { _id, name, variants, imageUrl } = getParsedProduct(item);

              return (
                <div
                  key={_id || index}
                  onClick={() => setOpenProduct(item)}
                  className="bg-white border border-gray-200 rounded-sm overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-150 flex flex-col"
                >
                  {/* IMAGE */}
                  <div className="relative aspect-[4/3] w-full bg-gray-50">
                    <Image
                      src={imageUrl}
                      alt={name}
                      fill
                      sizes="(max-width: 640px) 33vw, 25vw"
                      className="object-cover"
                      unoptimized={imageUrl.includes("cloudinary.com")}
                    />
                  </div>

                  {/* INFO */}
                  <div className="bg-[#f2f5f9] px-1 py-1 text-center border-t border-gray-200 flex-1 flex flex-col justify-center items-center">
                    <h3 className="text-[10px] sm:text-[11px] text-gray-800 leading-tight line-clamp-1 font-normal">
                      {name}
                    </h3>

                    <p className="text-[10px] sm:text-[11px] text-gray-900 font-medium leading-tight mt-0.5">
                      ({variants.length})
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ---------------- INFINITE LOADER TRIGGER ---------------- */}
          <div
            ref={loaderRef}
            className="py-4 flex justify-center items-center text-center min-h-[40px]"
          >
            {isFetchingNextPage ? (
              <p className="text-xs text-gray-600 animate-pulse font-medium">
                Loading more products...
              </p>
            ) : hasNextPage ? (
              <p className="text-[10px] text-gray-400">
                Scroll down to load more
              </p>
            ) : (
              <p className="text-[10px] text-gray-400">✓ All products loaded</p>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-gray-400 text-xs">
          No products found
        </div>
      )}
    </div>
  );
}
