"use client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import SearchBox from "@/components/ui/Application/Admin/SearchBox";
import ProductBox from "@/components/ui/Application/website/ProductBox";

const money = (n) => `৳ ${Number(n || 0).toLocaleString("en-BD")}`;

// -----------------------------------------------------
// Fetchers
// -----------------------------------------------------
async function fetchCategories() {
  const res = await fetch("/api/category", { cache: "no-store" });
  const json = await res.json();
  if (!json?.success) {
    throw new Error(json?.message || "Failed to load categories");
  }
  return Array.isArray(json.data) ? json.data : [];
}

async function fetchAllSubcats() {
  const res = await fetch("/api/subcategory", { cache: "no-store" });
  const json = await res.json();
  if (!json?.success) {
    throw new Error(json?.message || "Failed to load subcategories");
  }
  return Array.isArray(json.data) ? json.data : [];
}

async function fetchProducts(searchParamsString) {
  const params = new URLSearchParams(searchParamsString);

  if (!params.get("size")) params.set("size", "12");

  const res = await fetch(`/api/product/products?${params.toString()}`, {
    cache: "no-store",
  });
  const json = await res.json();

  if (!json?.success) {
    throw new Error(json?.message || "Failed to load products");
  }

  return {
    items: Array.isArray(json.items) ? json.items : [],
    total: Number(json.total || 0),
    start: Number(json.start || 0),
    size: Number(json.size || 12),
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

  // UI state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchText, setSearchText] = useState(q);

  // ---------------- URL helpers ----------------
  const pushParams = (params, mode = "push") => {
    const current = searchParams.toString();
    const next = params.toString();
    if (current === next) return;

    const url = next ? `/shop?${next}` : "/shop";
    if (mode === "replace") router.replace(url);
    else router.push(url);
  };

  const setCategory = (value) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) params.set("category", value);
    else params.delete("category");

    params.delete("subcategory");

    pushParams(params, "push");
    setMobileOpen(false);
  };

  const setCategoryWithSubcategory = (categoryValue, subValue) => {
    const params = new URLSearchParams(searchParams.toString());

    if (categoryValue) params.set("category", categoryValue);
    else params.delete("category");

    params.delete("subcategory");
    if (subValue) params.set("subcategory", subValue);

    params.set("start", "0");

    pushParams(params, "push");
    setMobileOpen(false);
  };

  const toggleSubcategory = (value) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentSub = (params.get("subcategory") || "").trim();

    if (currentSub === value) {
      params.delete("subcategory");
    } else {
      params.set("subcategory", value);
    }

    pushParams(params, "push");
  };

  const clearSubcategories = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("subcategory");

    pushParams(params, "push");
  };

  const clearSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");

    pushParams(params, "replace");
    setSearchText("");
  };

  const clearAll = () => {
    router.push("/shop");
    setMobileOpen(false);
    setSearchText("");
  };

  useEffect(() => {
    setSearchText(q);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => {
      const text = String(searchText || "").trim();
      const currentQ = (searchParams.get("q") || "").trim();

      if (text === currentQ) return;

      const params = new URLSearchParams(searchParams.toString());
      if (text) params.set("q", text);
      else params.delete("q");

      pushParams(params, "replace");
    }, 300);

    return () => clearTimeout(t);
  }, [searchText, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMoreRef = React.useRef(null);

  // =====================================================
  // Queries
  // =====================================================
  const { data: categories = [], error: catErrObj } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 60_000,
    retry: 1,
  });
  const catError = catErrObj?.message || null;

  const { data: allSubcats = [], error: allSubErrObj } = useQuery({
    queryKey: ["allSubcats"],
    queryFn: fetchAllSubcats,
    staleTime: 60_000,
    retry: 1,
  });
  const subError = allSubErrObj?.message || null;

  const spString = searchParams.toString();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    error: prodErrObj,
  } = useInfiniteQuery({
    queryKey: ["products", spString],
    queryFn: ({ pageParam = 0 }) => {
      const params = new URLSearchParams(spString);
      params.set("start", pageParam.toString()); // safe string
      return fetchProducts(params.toString());
    },
    getNextPageParam: (lastPage) => {
      // Fully safe check to prevent length errors
      if (
        !lastPage ||
        !Array.isArray(lastPage.items) ||
        lastPage.items.length === 0
      )
        return undefined;

      const nextStart = (lastPage.start || 0) + (lastPage.size || 12);
      return nextStart < (lastPage.total || 0) ? nextStart : undefined;
    },
    initialPageParam: 0,
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage, isFetchingNextPage]);

  const products = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((p) => (Array.isArray(p?.items) ? p.items : []));
  }, [data]);

  const error = prodErrObj?.message || null;

  // ---------------- Derived ----------------
  const activeCategoryLabel = useMemo(() => {
    if (!category) return "All";
    const found = categories.find(
      (c) => c.slug === category || c._id === category,
    );
    return found?.name || category;
  }, [category, categories]);

  const subcatsByCategory = useMemo(() => {
    const map = new Map();
    for (const s of allSubcats) {
      if (!s) continue; // skip null/undefined
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

  const activeCategoryId = useMemo(() => {
    const found = categories.find(
      (c) => c.slug === category || c._id === category,
    );
    return found?._id || "";
  }, [category, categories]);

  const activeCategorySubcats = useMemo(() => {
    if (!activeCategoryId) return [];
    return subcatsByCategory.get(activeCategoryId) || [];
  }, [activeCategoryId, subcatsByCategory]);

  // ---------------- UI ----------------
  const Sidebar = (
    <div className="w-96 rounded-xl border bg-background p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">Filters</h3>

        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="text-red-500 hover:text-red-600"
        >
          Clear
        </Button>
      </div>

      {/* Categories */}
      <div>
        <Accordion type="single" collapsible className="w-full">
          {categories.map((c) => {
            const catSubcats = subcatsByCategory.get(c._id) || [];
            const active = category === c.slug || category === c._id;

            return (
              <AccordionItem key={c._id} value={c.slug}>
                <AccordionTrigger
                  onClick={() => setCategory(c.slug)}
                  className={`text-lg ${active ? "text-primary font-semibold" : ""}`}
                >
                  {c.name}
                </AccordionTrigger>
                {catSubcats.length > 0 && (
                  <AccordionContent>
                    <div className="flex flex-col gap-1 pl-2">
                      {catSubcats.map((s) => (
                        <Button
                          key={s._id}
                          variant={
                            subcategory === s.slug ? "secondary" : "ghost"
                          }
                          size="sm"
                          className="justify-start text-base"
                          onClick={() =>
                            active
                              ? toggleSubcategory(s.slug)
                              : setCategoryWithSubcategory(c.slug, s.slug)
                          }
                        >
                          {s.name}
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                )}
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* All Category */}
        <Button
          variant={!category ? "default" : "outline"}
          className="w-full mt-4"
          onClick={() => setCategory("")}
        >
          All Category
        </Button>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen ">
      <div className="max-w-8xl mx-auto p-8">
        <div className="lg:hidden mb-5 flex items-center justify-between gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden px-4 py-2  font-extrabold text-sm border border-black bg-white hover:bg-gray-50 shadow-sm text-gray-950"
          >
            Filters
          </button>
        </div>

        <div className="lg:hidden flex flex-wrap gap-3 mb-4">
          {categories.map((c) => {
            const value = c.slug;
            const active = category === value || category === c._id;

            return (
              <button
                key={c._id}
                onClick={() => setCategory(value)}
                className={`px-4 py-2 rounded-full border text-sm font-extrabold transition shadow-sm hover:shadow-md hover:-translate-y-[1px]
                  ${
                    active
                      ? "bg-gray-950 text-white border-transparent"
                      : "bg-white text-gray-950 border-gray-200 hover:bg-gray-50"
                  }`}
              >
                {c.name}
              </button>
            );
          })}

          <button
            onClick={() => setCategory("")}
            className="px-4 py-2 rounded-full text-sm font-extrabold border transition shadow-sm bg-white text-gray-950 border-gray-200 hover:bg-gray-50 hover:shadow-md"
          >
            All
          </button>

          {category && activeCategorySubcats.length > 0 && (
            <div className="lg:hidden mb-6 flex flex-wrap gap-3">
              {activeCategorySubcats.map((s) => {
                const subValue = s.slug;
                const active = subcategory === subValue;

                return (
                  <button
                    key={s._id}
                    onClick={() => toggleSubcategory(subValue)}
                    className={`px-4 py-2 rounded-full border text-sm font-extrabold transition shadow-sm hover:shadow-md
                      ${
                        active
                          ? "bg-gray-950 text-white border-transparent"
                          : "bg-white text-gray-950 border-gray-200 hover:bg-gray-50"
                      }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-6">
          <aside className="hidden lg:block sticky top-4 ">{Sidebar}</aside>

          {mobileOpen && (
            <div className="lg:hidden fixed inset-0 z-50">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setMobileOpen(false)}
              />
              <div className="absolute left-0 top-0 h-full w-[360px] max-w-[90vw] bg-white p-4 overflow-auto">
                <div className="flex items-center justify-between mb-3">
                  <div className=" text-gray-950">Filter</div>
                  <button
                    className="text-sm font-extrabold underline decoration-2 underline-offset-4 text-gray-950"
                    onClick={() => setMobileOpen(false)}
                  >
                    Close
                  </button>
                </div>
                {Sidebar}
              </div>
            </div>
          )}

          <main className="flex-1">
            {/* Search */}

            <div className="space-y-2">
              <SearchBox
                value={searchText}
                onChange={setSearchText}
                onSubmit={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (searchText) params.set("q", searchText);
                  else params.delete("q");
                  pushParams(params, "replace");
                }}
              />
            </div>

            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap mt-2">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-yellow-100 border border-yellow-300 text-sm font-extrabold text-gray-950">
                  Category: {activeCategoryLabel}
                </span>

                {q ? (
                  <button
                    onClick={clearSearch}
                    className="px-3 py-1 rounded-full bg-yellow-100 border border-yellow-300 text-sm flex items-center gap-2 font-extrabold text-gray-950 hover:opacity-90"
                    title="Remove search"
                  >
                    <span>Search: {q}</span>
                    <span className="font-black">×</span>
                  </button>
                ) : null}

                {subcategory ? (
                  <button
                    onClick={clearSubcategories}
                    className="px-3 py-1 rounded-full bg-yellow-100 border border-yellow-300 text-sm flex items-center gap-2 font-extrabold text-gray-950 hover:opacity-90"
                    title="Remove sub filter"
                  >
                    <span>{subcategory}</span>
                    <span className="font-black">×</span>
                  </button>
                ) : null}
              </div>

              <button
                onClick={clearAll}
                className="text-sm font-extrabold underline decoration-2 underline-offset-4 text-red-700 hover:text-red-800"
              >
                Reset all
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {(isLoading || isFetching) &&
                Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border bg-white p-3 animate-pulse"
                  >
                    <div className="aspect-square bg-gray-200 rounded mb-3" />
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                  </div>
                ))}

              {!isLoading &&
                products.map((p) => {
                  console.log(
                    "Product:",
                    p.name,
                    "Variants:",
                    p.allVariants || p.variants,
                  );
                  return (
                    <ProductBox
                      key={p._id}
                      product={p}
                      userId={null} // pass your userId if available
                      allVariants={p.allVariants || p.variants || []} // ✅ pass variants
                      refreshWishlist={() =>
                        queryClient.invalidateQueries(["wishlistStatus"])
                      }
                    />
                  );
                })}
              {!isLoading && products.length === 0 ? (
                <div className="col-span-2 lg:col-span-4 text-gray-900 font-extrabold">
                  No products found.
                </div>
              ) : null}

              <div
                ref={loadMoreRef}
                className="col-span-2 lg:col-span-4 flex justify-center items-center py-4"
              >
                {isFetchingNextPage && (
                  <span className="text-sm text-gray-400">
                    Loading more products...
                  </span>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Export Page with local QueryClientProvider
// =====================================================
export default function Page() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ShopPageInner />
    </QueryClientProvider>
  );
}
