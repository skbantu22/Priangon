"use client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { Button } from "@/components/ui/button";
import React, { useEffect, useMemo, useState, useRef } from "react";
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

const money = (n) => `৳ ${Number(n || 0).toLocaleString("en-BD")}`;

// -----------------------------------------------------
// Fetchers
// -----------------------------------------------------
async function fetchCategories() {
  const res = await fetch("/api/category", { cache: "no-store" });
  const json = await res.json();
  if (!json?.success) throw new Error(json?.message || "Failed to load categories");
  return Array.isArray(json.data) ? json.data : [];
}

async function fetchAllSubcats() {
  const res = await fetch("/api/subcategory", { cache: "no-store" });
  const json = await res.json();
  if (!json?.success) throw new Error(json?.message || "Failed to load subcategories");
  return Array.isArray(json.data) ? json.data : [];
}

async function fetchProducts(searchParamsString) {
  const params = new URLSearchParams(searchParamsString);
  if (!params.get("size")) params.set("size", "12");

  const res = await fetch(`/api/product/products?${params.toString()}`, {
    cache: "no-store",
  });
  const json = await res.json();

  if (!json?.success) throw new Error(json?.message || "Failed to load products");

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
  const loadMoreRef = useRef(null);

  const category = (searchParams.get("category") || "").trim();
  const subcategory = (searchParams.get("subcategory") || "").trim();
  const q = (searchParams.get("q") || "").trim();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchText, setSearchText] = useState(q);

  const pushParams = (params, mode = "push") => {
    const next = params.toString();
    const url = next ? `/testh?${next}` : "/testh";
    if (mode === "replace") router.replace(url);
    else router.push(url);
  };

  const setCategory = (value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("category", value);
    else params.delete("category");
    params.delete("subcategory");
    params.set("start", "0");
    pushParams(params, "push");
    setMobileOpen(false);
  };

  const setCategoryWithSubcategory = (categoryValue, subValue) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categoryValue) params.set("category", categoryValue);
    params.delete("subcategory");
    if (subValue) params.set("subcategory", subValue);
    params.set("start", "0");
    pushParams(params, "push");
    setMobileOpen(false);
  };

  const toggleSubcategory = (value) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentSub = (params.get("subcategory") || "").trim();
    if (currentSub === value) params.delete("subcategory");
    else params.set("subcategory", value);
    params.set("start", "0");
    pushParams(params, "push");
  };

  const clearSubcategories = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("subcategory");
    params.set("start", "0");
    pushParams(params, "push");
  };

  const clearSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.set("start", "0");
    pushParams(params, "replace");
    setSearchText("");
  };

  const clearAll = () => {
    router.push("/testh");
    setMobileOpen(false);
    setSearchText("");
  };

  useEffect(() => { setSearchText(q); }, [q]);

  useEffect(() => {
    const t = setTimeout(() => {
      const text = String(searchText || "").trim();
      const currentQ = (searchParams.get("q") || "").trim();
      if (text === currentQ) return;
      const params = new URLSearchParams(searchParams.toString());
      if (text) params.set("q", text);
      else params.delete("q");
      params.set("start", "0");
      pushParams(params, "replace");
    }, 400);
    return () => clearTimeout(t);
  }, [searchText]);

  // Queries
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
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    error: prodErrObj
  } = useInfiniteQuery({
    queryKey: ["products", spString],
    queryFn: ({ pageParam = 0 }) => {
      const params = new URLSearchParams(spString);
      params.set("start", pageParam.toString()); // safe string
      return fetchProducts(params.toString());
    },
    getNextPageParam: (lastPage) => {
      // Fully safe check to prevent length errors
      if (!lastPage || !Array.isArray(lastPage.items) || lastPage.items.length === 0) return undefined;
  
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
      { rootMargin: "300px" }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage, isFetchingNextPage]);

  // Flatten products safely - ensures it's always an array
  const products = useMemo(() => {
    return data?.pages?.flatMap((p) => p?.items || []) || [];
  }, [data]);

  const activeCategoryLabel = useMemo(() => {
    if (!category) return "All";
    const found = categories.find((c) => c.slug === category || c._id === category);
    return found?.name || category;
  }, [category, categories]);

  const subcatsByCategory = useMemo(() => {
    const map = new Map();
    for (const s of allSubcats) {
      const catId = (typeof s?.category === "string" ? s.category : s?.category?._id) || s?.categoryId || "";
      if (!catId) continue;
      if (!map.has(catId)) map.set(catId, []);
      map.get(catId).push(s);
    }
    return map;
  }, [allSubcats]);

  const activeCategoryId = useMemo(() => {
    const found = categories.find((c) => c.slug === category || c._id === category);
    return found?._id || "";
  }, [category, categories]);

  const activeCategorySubcats = useMemo(() => {
    if (!activeCategoryId) return [];
    return subcatsByCategory.get(activeCategoryId) || [];
  }, [activeCategoryId, subcatsByCategory]);

  const Sidebar = (
    <div className="w-full lg:w-96 rounded-xl border bg-background p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">Filters</h3>
        <Button variant="ghost" size="sm" onClick={clearAll} className="text-red-500 hover:text-red-600">Clear</Button>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {categories.map((c) => {
          const catSubcats = subcatsByCategory.get(c._id) || [];
          const active = category === c.slug || category === c._id;
          return (
            <AccordionItem key={c._id} value={c.slug}>
              <AccordionTrigger
                onClick={() => setCategory(c.slug)}
                className={`text-sm ${active ? "text-primary font-semibold" : ""}`}
              >
                {c.name}
              </AccordionTrigger>
              {catSubcats.length > 0 && (
                <AccordionContent>
                  <div className="flex flex-col gap-1 pl-2">
                    {catSubcats.map((s) => (
                      <Button
                        key={s._id}
                        variant={subcategory === s.slug ? "secondary" : "ghost"}
                        size="sm"
                        className="justify-start text-sm"
                        onClick={() => active ? toggleSubcategory(s.slug) : setCategoryWithSubcategory(c.slug, s.slug)}
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
      <Button variant={!category ? "default" : "outline"} className="w-full mt-4" onClick={() => setCategory("")}>
        All Category
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-8xl mx-auto p-8">
        <div className="flex gap-6">
          <aside className="hidden lg:block sticky top-4 h-fit w-64 xl:w-80 shrink-0">
            {Sidebar}
          </aside>

          {mobileOpen && (
            <div className="lg:hidden fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
              <div className="absolute left-0 top-0 h-full w-[360px] max-w-[90vw] bg-white p-4 overflow-auto">
                <div className="flex items-center justify-between mb-3 font-extrabold text-gray-950">
                  <span>Filters</span>
                  <button onClick={() => setMobileOpen(false)}>Close</button>
                </div>
                {Sidebar}
              </div>
            </div>
          )}

          <main className="flex-1">
            <SearchBox value={searchText} onChange={setSearchText} />

            <div className="flex flex-wrap gap-2 my-4">
              <span className="px-3 py-1 rounded-full bg-yellow-100 border border-yellow-300 text-sm font-extrabold">
                Category: {activeCategoryLabel}
              </span>
              {q && (
                <button onClick={clearSearch} className="px-3 py-1 rounded-full bg-yellow-100 border border-yellow-300 text-sm flex items-center gap-2 font-extrabold">
                  Search: {q} <span className="font-black">×</span>
                </button>
              )}
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
                            const img =
                              p?.media?.[0]?.secure_url ||
                              "https://via.placeholder.com/600x600?text=Product";
          
                            return (
                              <Link
                              key={p._id}
                              href={`/product/${p.slug || p._id}`}
                              className="group block"
                            >
                              <div className="h-full rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                                <div className="relative w-full aspect-[3/4] sm:aspect-square bg-gray-50 overflow-hidden">
                                  <Image
                                    src={img}
                                    alt={p.name}
                                    fill
                                    className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                  />
                                </div>
          
                                <div className="p-3 sm:p-4">
                                  <h3 className="text-sm sm:text-base lg:text-lg font-extrabold leading-snug line-clamp-2 min-h-[40px] sm:min-h-[48px]">
                                    {p.name}
                                  </h3>
          
                                  <div className="mt-2 text-lg sm:text-xl font-bold text-orange-600">
                                    {money(p.sellingPrice)}
                                  </div>
          
                                  <div className="mt-2 w-full rounded-lg bg-gray-900 text-white py-2 text-center text-sm sm:text-base font-bold transition group-hover:bg-black">
                                    View
                                  </div>
                                </div>
                              </div>
                            </Link>
                            );
                          })}
          
                        {!isLoading && products.length === 0 ? (
            <div className="col-span-2 lg:col-span-4 text-gray-900 font-extrabold">
              No products found.
            </div>
          ) : null}
          
          <div ref={loadMoreRef} className="col-span-2 lg:col-span-4 flex justify-center items-center py-4">
            {isFetchingNextPage && (
              <span className="text-sm text-gray-400">Loading more products...</span>
            )}
          </div>
                      </div>

            {!isLoading && !isFetching && products.length === 0 && (
              <div className="py-20 text-center font-extrabold text-gray-500">No products found.</div>
            )}

            <div ref={loadMoreRef} className="py-10 flex justify-center">
              {isFetchingNextPage && <div className="text-sm font-bold text-gray-400 animate-pulse">Loading more...</div>}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <ShopPageInner />
    </QueryClientProvider>
  );
}