"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef, memo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const money = (n) => `৳ ${Number(n || 0).toLocaleString("en-BD")}`;

export default function Pagedemuu() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL States
  const category = searchParams.get("category") || "";
  const subcategory = useMemo(() => searchParams.getAll("subcategory"), [searchParams]);
  const q = searchParams.get("q") || "";

  // Data States
  const [categories, setCategories] = useState([]);
  const [subcatsMap, setSubcatsMap] = useState({});
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  // ✅ PREFETCH CACHE: Stores product results in memory
  const prefetchCache = useRef({});

  // Navigation Logic
  const updateParams = useCallback((updates, mode = "push") => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else if (Array.isArray(value)) {
        params.delete(key);
        value.forEach(v => params.append(key, v));
      } else params.set(key, value);
    });
    params.set("start", "0");
    const url = `${pathname}?${params.toString()}`;
    mode === "replace" ? router.replace(url, { scroll: false }) : router.push(url, { scroll: false });
  }, [searchParams, pathname, router]);

  // ✅ PREFETCH FUNCTION
  const handlePrefetch = async (catSlug, subSlugs = []) => {
    const params = new URLSearchParams();
    if (catSlug) params.set("category", catSlug);
    subSlugs.forEach(s => params.append("subcategory", s));
    
    const cacheKey = params.toString();
    if (prefetchCache.current[cacheKey]) return; // Already cached

    try {
      const res = await fetch(`/api/product/products?${cacheKey}`);
      const json = await res.json();
      if (json.success) {
        prefetchCache.current[cacheKey] = json;
      }
    } catch (e) { console.error("Prefetch failed", e); }
  };

  // Fetch Logic
  useEffect(() => {
    fetch("/api/category").then(r => r.json()).then(j => j.success && setCategories(j.data));
  }, []);

  useEffect(() => {
    const currentKey = searchParams.toString();
    
    // ✅ Check Cache First for Instant Update
    if (prefetchCache.current[currentKey]) {
      setData({ 
        items: prefetchCache.current[currentKey].items, 
        total: prefetchCache.current[currentKey].total 
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/product/products?${currentKey}`)
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setData({ items: j.items, total: j.total });
          prefetchCache.current[currentKey] = j; // Store in cache
        }
        setLoading(false);
      });
  }, [searchParams]);

  const toggleSub = (val) => {
    const next = subcategory.includes(val) ? subcategory.filter(v => v !== val) : [...subcategory, val];
    updateParams({ subcategory: next });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-4 md:p-8">
      {/* Mobile Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar lg:hidden">
        {categories.map((c) => (
          <button
            key={c._id}
            onMouseEnter={() => handlePrefetch(c.slug)} // ✅ Prefetch on Hover
            onClick={() => updateParams({ category: c.slug, subcategory: null })}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-black border transition-all ${
              category === c.slug ? "bg-indigo-600 text-white border-transparent" : "bg-white text-gray-800 border-gray-200"
            }`}
          >
            {c.name.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 space-y-4">
          <h3 className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Categories</h3>
          {categories.map((c) => (
            <div key={c._id}>
              <button
                onMouseEnter={() => handlePrefetch(c.slug)} // ✅ Prefetch on Hover
                onClick={() => updateParams({ category: c.slug, subcategory: null })}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  category === c.slug ? "bg-gray-950 text-white" : "hover:bg-gray-100"
                }`}
              >
                {c.name}
              </button>
              {category === c.slug && (subcatsMap[c.slug] || []).map(s => (
                <button
                  key={s._id}
                  onMouseEnter={() => handlePrefetch(c.slug, [s.slug])} // ✅ Prefetch Sub on Hover
                  onClick={() => toggleSub(s.slug)}
                  className={`block w-full text-left pl-8 py-2 text-xs font-bold ${
                    subcategory.includes(s.slug) ? "text-indigo-600" : "text-gray-500"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Product Grid */}
        <main className="flex-1">
          <div className={`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 transition-opacity duration-150 ${loading ? "opacity-50" : "opacity-100"}`}>
            {data.items.map((p) => (
              <div key={p._id} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                <img src={p.media?.[0]?.secure_url} className="aspect-square object-cover rounded-xl mb-3" alt="" />
                <h2 className="text-sm font-bold line-clamp-1">{p.name}</h2>
                <p className="text-indigo-600 font-black mt-1">{money(p.sellingPrice)}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}