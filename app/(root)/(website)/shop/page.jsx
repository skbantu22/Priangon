"use client";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  SlidersHorizontal,
  X,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from "lucide-react";
import SearchBox from "@/components/ui/Application/Admin/SearchBox";
import ProductBox from "@/components/ui/Application/website/ProductBox";

const money = (n) => `৳ ${Number(n || 0).toLocaleString("en-BD")}`;

// =====================================================
// Fetchers
// =====================================================
async function fetchCategories() {
  const res = await fetch("/api/category?size=1000", { cache: "no-store" });
  const json = await res.json();
  if (!json?.success)
    throw new Error(json?.message || "Failed to load categories");
  return Array.isArray(json.data) ? json.data : [];
}

async function fetchAllSubcats() {
  const res = await fetch("/api/subcategory", { cache: "no-store" });
  const json = await res.json();
  if (!json?.success)
    throw new Error(json?.message || "Failed to load subcategories");
  return Array.isArray(json.data) ? json.data : [];
}

async function fetchProducts(searchParamsString) {
  const params = new URLSearchParams(searchParamsString);
  const size = parseInt(params.get("size") || "12", 10);
  const page = parseInt(params.get("page") || "1", 10);

  // Convert "page" into API's expected "start" (offset)
  params.set("size", size.toString());
  params.set("start", ((page - 1) * size).toString());

  const res = await fetch(`/api/product/products?${params.toString()}`, {
    cache: "no-store",
  });
  const json = await res.json();
  if (!json?.success)
    throw new Error(json?.message || "Failed to load products");

  return {
    items: Array.isArray(json.items) ? json.items : [],
    total: Number(json.total || 0),
    page: page,
    size: size,
    totalPages: Math.ceil(Number(json.total || 0) / size),
  };
}

// =====================================================
// Inner Page
// =====================================================
function ShopPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // URL params
  const category = (searchParams.get("category") || "").trim();
  const subcategory = (searchParams.get("subcategory") || "").trim();
  const q = (searchParams.get("q") || "").trim();
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  // UI state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchText, setSearchText] = useState(q);

  // Local Price State
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);

  // ---------------- URL helpers ----------------
  const pushParams = (params, mode = "push") => {
    const current = searchParams.toString();
    const next = params.toString();
    if (current === next) return;
    const url = next ? `/shop?${next}` : "/shop";
    if (mode === "replace") router.replace(url);
    else router.push(url);
  };

  // Update Filters & Reset Page to 1
  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);

    // Auto reset dependencies
    if (key === "category") params.delete("subcategory");
    params.set("page", "1"); // reset pagination

    pushParams(params, "push");
  };

  const setCategoryWithSubcategory = (catVal, subVal) => {
    const params = new URLSearchParams(searchParams.toString());
    if (catVal) params.set("category", catVal);
    else params.delete("category");
    params.delete("subcategory");
    if (subVal) params.set("subcategory", subVal);

    params.set("page", "1");
    pushParams(params, "push");
    setMobileOpen(false);
  };

  const applyPriceFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (localMin) params.set("minPrice", localMin);
    else params.delete("minPrice");
    if (localMax) params.set("maxPrice", localMax);
    else params.delete("maxPrice");
    params.set("page", "1");
    pushParams(params, "push");
    setMobileOpen(false);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    pushParams(params, "push");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearAll = () => {
    router.push("/shop");
    setMobileOpen(false);
    setSearchText("");
    setLocalMin("");
    setLocalMax("");
  };

  // Sync Search & Price Text from URL
  useEffect(() => {
    setSearchText(q);
  }, [q]);
  useEffect(() => {
    setLocalMin(minPrice);
    setLocalMax(maxPrice);
  }, [minPrice, maxPrice]);

  useEffect(() => {
    const t = setTimeout(() => {
      const text = String(searchText || "").trim();
      const currentQ = (searchParams.get("q") || "").trim();
      if (text === currentQ) return;
      const params = new URLSearchParams(searchParams.toString());
      if (text) params.set("q", text);
      else params.delete("q");
      params.set("page", "1");
      pushParams(params, "replace");
    }, 500);
    return () => clearTimeout(t);
  }, [searchText, searchParams]);

  // =====================================================
  // Queries
  // =====================================================
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 60_000,
  });

  const { data: allSubcats = [] } = useQuery({
    queryKey: ["allSubcats"],
    queryFn: fetchAllSubcats,
    staleTime: 60_000,
  });

  const spString = searchParams.toString();

  const {
    data: prodData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["products", spString],
    queryFn: () => fetchProducts(spString),
    staleTime: 60_000,
    keepPreviousData: true, // keeps previous data while fetching new page for smooth UI
  });

  const products = prodData?.items || [];
  const totalPages = prodData?.totalPages || 1;
  const totalItems = prodData?.total || 0;

  // ---------------- Derived Logic ----------------
  const activeCategoryLabel = useMemo(() => {
    if (!category) return "All Products";
    const found = categories.find(
      (c) => c.slug === category || c._id === category,
    );
    return found?.name || category;
  }, [category, categories]);

  const subcatsByCategory = useMemo(() => {
    const map = new Map();
    for (const s of allSubcats) {
      if (!s) continue;
      const catId =
        (typeof s?.category === "string" ? s.category : s?.category?._id) ||
        s?.categoryId ||
        "";
      if (!catId) continue;
      if (!map.has(catId)) map.set(catId, []);
      map.get(catId).push(s);
    }
    return map;
  }, [allSubcats]);

  // ---------------- UI Sidebar ----------------
  const Sidebar = (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h3 className="font-black text-sm uppercase tracking-widest text-zinc-900 flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-pink-600" />
          Filter Collection
        </h3>
        {(category || subcategory || q || minPrice || maxPrice) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full px-3"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* 💰 NEW: Advanced Price Range Filter */}
      <div className="space-y-3 pb-4 border-b border-zinc-100">
        <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block mb-1">
          Price Range
        </span>
        <div className="flex items-center gap-2">
          <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">
              ৳
            </span>
            <Input
              type="number"
              placeholder="Min"
              value={localMin}
              onChange={(e) => setLocalMin(e.target.value)}
              className="pl-7 h-10 text-xs font-bold rounded-xl border-zinc-200 focus:border-pink-500 focus:ring-pink-500"
            />
          </div>
          <span className="text-zinc-300 font-black">-</span>
          <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">
              ৳
            </span>
            <Input
              type="number"
              placeholder="Max"
              value={localMax}
              onChange={(e) => setLocalMax(e.target.value)}
              className="pl-7 h-10 text-xs font-bold rounded-xl border-zinc-200 focus:border-pink-500 focus:ring-pink-500"
            />
          </div>
        </div>
        <Button
          onClick={applyPriceFilter}
          className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs uppercase font-extrabold tracking-wider rounded-xl h-10"
        >
          Apply Price
        </Button>
      </div>

      {/* Categories Accordion */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block mb-2">
          Categories
        </span>
        <Button
          variant={!category ? "default" : "outline"}
          className={`w-full justify-start text-xs font-bold uppercase tracking-wider h-10 rounded-xl transition-all duration-300 ${
            !category
              ? "bg-zinc-950 text-white shadow-lg shadow-zinc-950/20"
              : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
          }`}
          onClick={() => {
            updateFilter("category", "");
            setMobileOpen(false);
          }}
        >
          ✨ All Collections
        </Button>

        <Accordion
          type="single"
          collapsible
          className="w-full space-y-1.5 mt-2"
        >
          {categories.map((c) => {
            const catSubcats = subcatsByCategory.get(c._id) || [];
            const active = category === c.slug || category === c._id;

            return (
              <AccordionItem key={c._id} value={c.slug} className="border-none">
                <div
                  className={`flex items-center justify-between w-full rounded-xl transition-all duration-200 ${
                    active
                      ? "bg-pink-50/70 border border-pink-100"
                      : "border border-zinc-100 hover:bg-zinc-50/80"
                  }`}
                >
                  <button
                    onClick={() => {
                      updateFilter("category", c.slug);
                      setMobileOpen(false);
                    }}
                    className={`flex-1 text-left py-2.5 px-4 text-xs uppercase font-extrabold tracking-wider transition-colors duration-200 ${
                      active ? "text-pink-600" : "text-zinc-800"
                    }`}
                  >
                    {c.name}
                  </button>
                  {catSubcats.length > 0 && (
                    <AccordionTrigger
                      className={`pr-4 pl-0 py-0 hover:no-underline text-zinc-400 ${active ? "text-pink-500" : ""}`}
                    />
                  )}
                </div>

                {catSubcats.length > 0 && (
                  <AccordionContent className="pt-1 pb-2 px-2 bg-zinc-50/50 rounded-b-xl border border-t-0 border-zinc-100/50 mt-[-4px]">
                    <div className="flex flex-col gap-1 mt-1">
                      {catSubcats.map((s) => {
                        const isSubActive = subcategory === s.slug;
                        return (
                          <button
                            key={s._id}
                            onClick={() =>
                              active
                                ? updateFilter(
                                    "subcategory",
                                    isSubActive ? "" : s.slug,
                                  )
                                : setCategoryWithSubcategory(c.slug, s.slug)
                            }
                            className={`w-full text-left px-4 py-2 text-[11px] font-bold uppercase tracking-wide rounded-lg transition-all duration-150 ${
                              isSubActive
                                ? "bg-white text-pink-600 border border-pink-100 shadow-sm font-black"
                                : "text-zinc-500 hover:bg-white hover:text-zinc-900"
                            }`}
                          >
                            • {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </AccordionContent>
                )}
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50/30">
      <div className="max-w-[1440px] mx-auto p-4 lg:p-8">
        {/* MOBILE TRIGGER */}
        <div className="lg:hidden mb-4 flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">
              Collection
            </span>
            <span className="text-xs font-black text-zinc-900 uppercase truncate max-w-[180px]">
              {activeCategoryLabel}
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center gap-2 px-4 py-2 font-black text-xs uppercase border border-zinc-950 bg-zinc-950 text-white rounded-xl shadow-md active:scale-95 transition-transform"
          >
            <SlidersHorizontal size={14} /> Filters
          </button>
        </div>

        <div className="flex gap-8 items-start">
          {/* DESKTOP SIDEBAR */}
          <aside className="hidden lg:block sticky top-24 w-[280px] shrink-0 bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
            {Sidebar}
          </aside>

          {/* MOBILE DRAWER */}
          {mobileOpen && (
            <div className="fixed inset-0 z-[100] lg:hidden">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setMobileOpen(false)}
              />
              <div className="absolute left-0 top-0 h-full w-[320px] max-w-[90vw] bg-white p-5 overflow-auto shadow-2xl flex flex-col">
                <div className="flex items-center justify-between mb-4 border-b pb-3">
                  <div className="font-black text-xs uppercase tracking-wider text-zinc-900">
                    Filter Options
                  </div>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-1.5 bg-zinc-100 rounded-full text-zinc-700"
                  >
                    <X size={16} />
                  </button>
                </div>
                {Sidebar}
              </div>
            </div>
          )}

          {/* MAIN LISTING AREA */}
          <main className="flex-1 space-y-4">
            {/* Search Box */}
            <div className="bg-white p-2 rounded-2xl border border-zinc-100 shadow-sm">
              <SearchBox
                value={searchText}
                onChange={setSearchText}
                onSubmit={() => {
                  updateFilter("q", searchText);
                }}
              />
            </div>

            {/* Tags & Summary */}
            <div className="flex items-center justify-between gap-3 flex-wrap bg-white/60 px-2 py-1 rounded-xl">
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1">
                  {totalItems} Products Found
                </span>

                {q && (
                  <button
                    onClick={() => updateFilter("q", "")}
                    className="px-3 py-1 rounded-lg bg-pink-50 border border-pink-100 text-pink-600 text-[10px] flex items-center gap-1.5 font-bold uppercase tracking-wide hover:bg-pink-100/70"
                  >
                    Search: "{q}" <X size={10} className="stroke-[3]" />
                  </button>
                )}
                {minPrice || maxPrice ? (
                  <button
                    onClick={() => {
                      updateFilter("minPrice", "");
                      updateFilter("maxPrice", "");
                      setLocalMin("");
                      setLocalMax("");
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] flex items-center gap-1.5 font-bold uppercase tracking-wide hover:bg-emerald-100/70"
                  >
                    ৳ {minPrice || 0} - {maxPrice || "Max"}{" "}
                    <X size={10} className="stroke-[3]" />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-5">
              {(isLoading || isFetching) &&
                Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-zinc-100 bg-white p-3 space-y-3 shadow-sm animate-pulse"
                  >
                    <div className="aspect-[4/5] bg-zinc-100 rounded-xl w-full" />
                    <div className="h-3.5 bg-zinc-100 rounded-md w-5/6" />
                    <div className="h-3 bg-zinc-100 rounded-md w-1/2" />
                  </div>
                ))}

              {!isLoading &&
                products.map((p) => (
                  <ProductBox
                    key={p._id}
                    product={p}
                    userId={null}
                    allVariants={p.allVariants || p.variants || []}
                    refreshWishlist={() =>
                      queryClient.invalidateQueries(["wishlistStatus"])
                    }
                  />
                ))}

              {!isLoading && products.length === 0 && (
                <div className="col-span-full bg-white border border-dashed border-zinc-200 rounded-2xl p-12 text-center">
                  <span className="text-zinc-400 font-bold text-sm block">
                    No items match your filter criteria.
                  </span>
                </div>
              )}
            </div>

            {/* 📄 NEW: Modern Pagination */}
            {!isLoading && totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-8 pb-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors shadow-sm"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex gap-1.5 bg-white p-1 rounded-xl border shadow-sm">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    const isActive = pageNum === currentPage;

                    // Simple logic to prevent too many buttons if there are 10+ pages
                    if (
                      totalPages > 5 &&
                      (pageNum < currentPage - 1 ||
                        pageNum > currentPage + 1) &&
                      pageNum !== 1 &&
                      pageNum !== totalPages
                    ) {
                      if (pageNum === 2 || pageNum === totalPages - 1)
                        return (
                          <span key={i} className="px-2 text-zinc-400">
                            ...
                          </span>
                        );
                      return null;
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black transition-all ${
                          isActive
                            ? "bg-pink-500 text-white shadow-md shadow-pink-500/30"
                            : "text-zinc-600 hover:bg-zinc-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="p-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors shadow-sm"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ShopPageInner />
    </QueryClientProvider>
  );
}
