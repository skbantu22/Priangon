"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const money = (n) => `৳ ${Number(n || 0).toLocaleString("en-BD")}`;

export default function Pagedemuuui() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const category = (searchParams.get("category") || "").trim();
  const subcategory = searchParams.getAll("subcategory").map((s) => String(s).trim()).filter(Boolean);
  const q = (searchParams.get("q") || "").trim();

  const [searchText, setSearchText] = useState(q);
  const [categories, setCategories] = useState([]);
  const [subcats, setSubcats] = useState([]);
  const [data, setData] = useState({ items: [], total: 0, start: 0, size: 12 });

  // ---------------- Navigation ----------------
  const pushParams = (params, mode = "push") => {
    const next = params.toString();
    const url = next ? `/testh?${next}` : "/testh";
    if (mode === "replace") router.replace(url);
    else router.push(url);
  };

  const setCategory = (value) => {
    const params = new URLSearchParams(searchParams.toString());
    value ? params.set("category", value) : params.delete("category");
    params.delete("subcategory");
    params.set("start", "0");
    pushParams(params, "push");
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

  const clearAll = () => {
    router.push("/testh");
    setSearchText("");
  };

  const clearSubcategories = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("subcategory");
    pushParams(params, "push");
  };

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchText.trim() === q) return;
      const params = new URLSearchParams(searchParams.toString());
      searchText.trim() ? params.set("q", searchText.trim()) : params.delete("q");
      params.set("start", "0");
      pushParams(params, "replace");
    }, 300);
    return () => clearTimeout(t);
  }, [searchText]);

  // ---------------- Fetching ----------------
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/category");
      const json = await res.json();
      if (json?.success) setCategories(json.data || []);
    })();
  }, []);

  const activeCategoryDoc = useMemo(() =>
    categories.find((c) => c.slug === category || c._id === category) || null
    , [categories, category]);

  const activeCategoryId = activeCategoryDoc?._id || (category.length === 24 ? category : "");
  const activeCategorySlug = activeCategoryDoc?.slug || category;

  useEffect(() => {
    if (!category) return;
    (async () => {
      const res = await fetch(`/api/subcategory?category=${encodeURIComponent(activeCategoryId || category)}`);
      const json = await res.json();
      if (json?.success) setSubcats(json.data || []);
    })();
  }, [category, activeCategoryId]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/product/products?${searchParams.toString()}`);
      const json = await res.json();
      if (json?.success) setData({ items: json.items || [], total: json.total || 0 });
    })();
  }, [searchParams]);

  const subCounts = useMemo(() => {
    const map = {};
    data.items.forEach(p => {
      const slug = p?.subcategory?.slug || "__none__";
      map[slug] = (map[slug] || 0) + 1;
    });
    return map;
  }, [data.items]);

  const visibleSubcats = useMemo(() => {
    if (!category || !subcats.length) return [];
    return subcats.filter(s => s?.categoryId === activeCategoryId || s?.categoryId === activeCategorySlug || s?.categoryId === category);
  }, [subcats, category, activeCategoryId, activeCategorySlug]);

  const Sidebar = (
    <div className="w-[320px] shrink-0 rounded-2xl p-4 bg-white/90 backdrop-blur-md border border-white/70 shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-black text-gray-950 text-xl italic uppercase">Filters</h3>
        <button onClick={clearAll} className="text-xs font-bold text-red-500 hover:underline">RESET</button>
      </div>

      <input
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder="Instant search..."
        className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-950 bg-gray-50 focus:border-indigo-500 outline-none transition-all mb-6"
      />

      <div className="space-y-3">
        {categories.map((c) => {
          const active = category === c.slug || category === c._id;
          return (
            <div key={c._id} className="group">
              <button
                onClick={() => setCategory(c.slug)}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between transition-all ${active ? "bg-indigo-600 text-white shadow-lg scale-[1.02]" : "bg-gray-50 text-gray-700 hover:bg-gray-100"}`}
              >
                <span>{c.name}</span>
                <span className="opacity-50">{active ? "−" : "+"}</span>
              </button>
              {active && (
                <div className="mt-2 ml-2 space-y-1 border-l-2 border-gray-100 pl-3">
                  {visibleSubcats.map((s) => (
                    <button
                      key={s._id}
                      onClick={() => toggleSubcategory(s.slug)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${subcategory.includes(s.slug) ? "bg-gray-950 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                      {s.name}
                      <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 rounded-full">{subCounts[s.slug] || 0}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-950 selection:bg-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Mobile View: Category & Subcategory Pills */}
        <div className="lg:hidden flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setCategory("")}
              className={`px-4 py-2 rounded-full text-sm font-extrabold border transition shadow-sm ${!category ? "bg-indigo-600 text-white border-transparent" : "bg-white text-gray-950 border-gray-200"}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c._id}
                onClick={() => setCategory(c.slug)}
                className={`px-4 py-2 rounded-full border text-sm font-extrabold transition shadow-sm ${category === c.slug || category === c._id ? "bg-gradient-to-r from-indigo-700 to-fuchsia-700 text-white border-transparent" : "bg-white text-gray-950 border-gray-200"}`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {category && visibleSubcats.length > 0 && (
            <div className="rounded-2xl p-4 bg-white/85 backdrop-blur border border-white/70 shadow-lg">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="font-extrabold text-gray-950 text-base">{activeCategoryDoc?.name} Subcategories</div>
                <button onClick={clearSubcategories} className="text-sm font-extrabold underline decoration-2 underline-offset-4 text-gray-950">Clear</button>
              </div>
              <div className="flex flex-wrap gap-3">
                {visibleSubcats.map((s) => (
                  <button
                    key={s._id}
                    onClick={() => toggleSubcategory(s.slug)}
                    className={`px-4 py-2 rounded-full border text-sm flex items-center gap-2 transition ${subcategory.includes(s.slug) ? "bg-gray-950 text-white border-transparent" : "bg-white text-gray-950 border-gray-200"}`}
                  >
                    <span className="font-extrabold">{s.name}</span>
                    <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${subcategory.includes(s.slug) ? "bg-white/15 text-white" : "bg-gray-200 text-gray-950"}`}>
                      {subCounts[s.slug] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-8">
          <aside className="hidden lg:block sticky top-6 h-fit">{Sidebar}</aside>

          <main className="flex-1">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {data.items.map((p) => (
                <div
                  key={p._id}
                  onClick={() => router.push(`/product/${p.slug}`)}
                  className="group cursor-pointer rounded-3xl bg-white border border-gray-100 p-2 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
                    <img
                      src={p?.media?.[0]?.secure_url || "https://via.placeholder.com/400x500"}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                        {p.category?.name || "New"}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h2 className="font-black text-gray-950 leading-tight line-clamp-1 group-hover:text-indigo-600 transition-colors">{p.name}</h2>
                    <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{p.subcategory?.name || "Collection"}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-lg font-black text-indigo-600">{money(p.sellingPrice)}</span>
                      <div className="h-8 w-8 rounded-full bg-gray-950 text-white flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}