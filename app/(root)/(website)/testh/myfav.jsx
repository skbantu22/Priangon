"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ✅ TanStack Query
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import Pagedemu from "./codedemu";
import Pagedemuu from "./fgfgf";
import Pagedemuuui from "./fgffgf";
import Link from "next/link";

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

/**
 * ✅ Fetch ALL subcategories (recommended)
 * You need API like: GET /api/subcategory  -> returns all subcats with categoryId/category populated
 * If your API doesn't support it, see note below.
 */
async function fetchAllSubcats() {
  const res = await fetch(`/api/subcategory`, { cache: "no-store" });
  const json = await res.json();
  if (!json?.success) throw new Error(json?.message || "Failed to load subcategories");
  return Array.isArray(json.data) ? json.data : [];
}

async function fetchProducts(searchParamsString) {
  const params = new URLSearchParams(searchParamsString);

  if (!params.get("start")) params.set("start", "0");
  if (!params.get("size")) params.set("size", "12");

  const res = await fetch(`/api/product/products?${params.toString()}`, { cache: "no-store" });
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

  // ✅ URL params
  const category = (searchParams.get("category") || "").trim(); // slug OR id
  const subcategory = searchParams
    .getAll("subcategory")
    .map((s) => String(s).trim())
    .filter(Boolean);
  const q = (searchParams.get("q") || "").trim();

  // UI state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchText, setSearchText] = useState(q);

  // ---------------- URL helpers (NO LOOP) ----------------
  const pushParams = (params, mode = "push") => {
    const current = searchParams.toString();
    const next = params.toString();
    if (current === next) return;

    const url = next ? `/testh?${next}` : "/testh";
    if (mode === "replace") router.replace(url);
    else router.push(url);
  };

  const setCategory = (value) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) params.set("category", value);
    else params.delete("category");

    // ✅ clear subcategory when category changes
    params.delete("subcategory");
    params.set("start", "0");

    pushParams(params, "push");
    setMobileOpen(false);
  };

  const toggleSubcategory = (value) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll("subcategory");
    const exists = current.includes(value);

    params.delete("subcategory");
    const next = exists ? current.filter((v) => v !== value) : [...current, value];
    next.forEach((v) => params.append("subcategory", v));

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

  // ✅ keep input synced when back/forward changes q
  useEffect(() => {
    setSearchText(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // ✅ Debounced search -> URL
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
    }, 300);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // =====================================================
  // ✅ TanStack Queries
  // =====================================================
  const { data: categories = [], error: catErrObj } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 60_000,
    retry: 1,
  });
  const catError = catErrObj ? catErrObj?.message || "Category load error" : null;

  // ✅ ALL subcats (for every category UI)
  const { data: allSubcats = [], error: allSubErrObj } = useQuery({
    queryKey: ["allSubcats"],
    queryFn: fetchAllSubcats,
    staleTime: 60_000,
    retry: 1,
  });
  const subError = allSubErrObj ? allSubErrObj?.message || "Subcategory load error" : null;

  // Products
  const spString = searchParams.toString();
  const { data: data = { items: [], total: 0, start: 0, size: 12 }, error: prodErrObj } = useQuery({
    queryKey: ["products", spString],
    queryFn: () => fetchProducts(spString),
    keepPreviousData: true,
    staleTime: 5_000,
    retry: 1,
  });
  const error = prodErrObj ? prodErrObj?.message || "Product load error" : null;

  // ---------------- Derived ----------------
  const activeCategoryLabel = useMemo(() => {
    if (!category) return "All";
    const found = categories.find((c) => c.slug === category || c._id === category);
    return found?.name || category;
  }, [category, categories]);

  // ✅ group ALL subcats by category (id or populated object)
  const subcatsByCategory = useMemo(() => {
    const map = new Map(); // key -> array

    for (const s of allSubcats) {
      // support both shapes:
      // 1) s.category is id string
      // 2) s.category is object { _id, slug, name }
      // 3) s.categoryId is id string
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

  // ✅ counts from CURRENT loaded items (still same logic)
  const subCounts = useMemo(() => {
    const map = {};
    for (const p of data.items) {
      const subSlug = p?.subcategory?.slug || "__none__";
      map[subSlug] = (map[subSlug] || 0) + 1;
    }
    return map;
  }, [data.items]);

  // ---------------- UI ----------------
  const Sidebar = (
    <div className="w-[320px] shrink-0 rounded-2xl p-4 bg-white/85 backdrop-blur border border-white/70 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-extrabold text-gray-950 tracking-tight text-lg">Filters</h3>
        <button
          onClick={clearAll}
          className="text-sm font-extrabold underline decoration-2 underline-offset-4 text-red-700 hover:text-red-800"
        >
          Clear all
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <label className="block text-sm font-extrabold text-gray-950 mb-2">Search (auto)</label>

        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Type to search..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-950 bg-white"
        />

        {q ? (
          <button
            onClick={clearSearch}
            className="mt-2 text-sm font-extrabold underline decoration-2 underline-offset-4 text-gray-950 hover:opacity-90"
          >
            Clear search
          </button>
        ) : null}
      </div>

      {/* Categories */}
      <div className="flex flex-col gap-2">
        {catError ? (
          <div className="text-sm font-bold text-red-700">{catError}</div>
        ) : (
          categories.map((c) => {
            const value = c.slug; // ✅ store slug in URL
            const active = category === value || category === c._id;

            // ✅ get subcats for THIS category id
            const catSubcats = subcatsByCategory.get(c._id) || [];

            return (
             
              <div key={c._id} className="border border-gray-200 rounded-2xl p-2 bg-white">
               
             
                <button
                  onClick={() => setCategory(value)}
                  className={`w-full text-left px-3 py-2 rounded-xl font-extrabold transition flex items-center justify-between
                    ${
                      active
                        ? "bg-gradient-to-r from-indigo-700 to-fuchsia-700 text-white shadow-md"
                        : "bg-gray-50 text-gray-950 hover:bg-gray-100"
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">{c.name}</span>
                  </span>
                  <span className="text-sm">{active ? "▾" : "▸"}</span>
                </button>

                {/* ✅ Subcategories for EVERY category (not only active) */}
                <div className="mt-2 flex flex-col gap-1 pl-1">
                  {subError ? (
                    <div className="text-sm font-bold text-red-700 px-3 py-2">{subError}</div>
                  ) : catSubcats.length === 0 ? (
                    <div className="text-sm font-bold text-gray-700 px-3 py-2">No subcategory found.</div>
                  ) : (
                    catSubcats.map((s) => {
                      const subValue = s.slug;
                      const subActive = subcategory.includes(subValue);
                      const count = subCounts?.[subValue] ?? 0;

                      return (
                        <button
                          key={s._id}
                          onClick={() => {
                            // ✅ ensure correct category in URL when choosing subcategory
                            if (!active) setCategory(c.slug);
                            toggleSubcategory(subValue);
                          }}
                          className={`text-left text-sm px-3 py-2 rounded-xl transition flex items-center justify-between
                              ${
                                subActive
                                  ? "bg-gray-950 text-white shadow"
                                  : "bg-white text-gray-900 hover:bg-gray-50"
                              }`}
                        >
                          <span className="font-bold">{s.name}</span>
                          <span
                            className={`text-xs font-extrabold px-2 py-0.5 rounded-full
                                ${subActive ? "bg-white/15 text-white" : "bg-gray-200 text-gray-900"}`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })
                  )}

                  {/* ✅ clear only makes sense when this category is active */}
                  {active ? (
                    <button
                      onClick={clearSubcategories}
                      className="mt-1 text-sm font-extrabold underline decoration-2 underline-offset-4 hover:opacity-90 text-gray-900 text-left px-2"
                    >
                      Clear subcategory
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}

        <button
          onClick={() => setCategory("")}
          className="w-full text-left px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 font-extrabold text-gray-950"
        >
          All Category
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="lg:hidden mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-950">
              Shop Filters + Auto Search
            </h1>
            <p className="text-sm font-semibold text-gray-800 mt-1">
              Type in search box → URL updates → products filter automatically.
            </p>
          </div>

          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden px-4 py-2 rounded-full font-extrabold text-sm border border-gray-200 bg-white hover:bg-gray-50 shadow-sm text-gray-950"
          >
            Filters
          </button>
        </div>

        {/* Mobile category pills */}
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
                      ? "bg-gradient-to-r from-indigo-700 to-fuchsia-700 text-white border-transparent"
                      : "bg-white text-gray-950 border-gray-200 hover:bg-gray-50"
                  }`}
              >
                {c.name}
              </button>
            );
          })}

          <button
            onClick={() => setCategory("")}
            className="px-4 py-2 rounded-full text-sm font-extrabold border transition shadow-sm
              bg-white text-gray-950 border-gray-200 hover:bg-gray-50 hover:shadow-md"
          >
            All
          </button>


          {/* ✅ Mobile Subcategory Pills (only when category selected) */}
{category && (
  <div className="lg:hidden mb-6 flex flex-wrap gap-3">
    {(subcatsByCategory.get(category) ||
      subcatsByCategory.get(
        categories.find((c) => c.slug === category || c._id === category)?._id
      ) ||
      []
    ).map((s) => {
      const subValue = s.slug;
      const active = subcategory.includes(subValue);
      const count = subCounts?.[subValue] ?? 0;

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
          {count > 0 && (
            <span className="ml-2 text-xs font-black">({count})</span>
          )}
        </button>
      );
    })}
  </div>
)}


        </div>

        {/* layout */}
        <div className="flex gap-6">
          <aside className="hidden lg:block sticky top-4 h-fit">{Sidebar}</aside>

          {mobileOpen && (
            <div className="lg:hidden fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
              <div className="absolute left-0 top-0 h-full w-[360px] max-w-[90vw] bg-white p-4 overflow-auto">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-extrabold text-gray-950">Filters</div>
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
            {/* chips */}
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
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

                {subcategory.map((v) => (
                  <button
                    key={v}
                    onClick={() => toggleSubcategory(v)}
                    className="px-3 py-1 rounded-full bg-yellow-100 border border-yellow-300 text-sm flex items-center gap-2 font-extrabold text-gray-950 hover:opacity-90"
                    title="Remove sub filter"
                  >
                    <span>{v}</span>
                    <span className="font-black">×</span>
                  </button>
                ))}
              </div>

              <button
                onClick={clearAll}
                className="text-sm font-extrabold underline decoration-2 underline-offset-4 text-red-700 hover:text-red-800"
              >
                Reset all
              </button>
            </div>

            {/* status */}
            {error ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
                {error}
              </div>
            ) : null}

            {/* products */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {data.items.map((p) => {
                const img =
                  p?.media?.[0]?.secure_url ||
                  (typeof p?.media?.[0] === "string" ? p.media[0] : "") ||
                  "https://via.placeholder.com/600x600?text=Product";

                const catSlug = p?.category?.slug || "";
                const subSlug = p?.subcategory?.slug || "—";

                return (
                  
                  <Link
                  
                   key={p._id}
      href={`/product/${p.slug || p._id}`}
      className="block"
                  >
                  <div
                    key={p._id}
                    className="rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative">
                      <img src={img} alt={p.name} className="h-52 w-full object-fill" loading="lazy" />
                      {catSlug ? (
                        <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-extrabold text-white bg-gradient-to-r from-indigo-700 to-fuchsia-700 shadow">
                          {catSlug.toUpperCase()}
                        </div>
                      ) : null}
                    </div>

                    <div className="p-4">
                      <div className="font-extrabold text-gray-950 tracking-tight">{p.name}</div>
                      

                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold">
                          {money(p.sellingPrice ?? 0)}
                        </div>

                        <button
                          onClick={() => router.push(`/product/${p.slug || p._id}`)}
                          className="px-3 py-2 rounded-xl text-sm font-extrabold text-white shadow-sm bg-gradient-to-r from-gray-950 to-gray-800 hover:opacity-95"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                  </Link>
                );
              })}

              {data.items.length === 0 ? (
                <div className="col-span-2 lg:col-span-3 text-gray-900 font-extrabold">No products found.</div>
              ) : null}
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
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ShopPageInner />
        <Pagedemu />
        <Pagedemuu />
        <Pagedemuuui />
    </QueryClientProvider>
  );
}
