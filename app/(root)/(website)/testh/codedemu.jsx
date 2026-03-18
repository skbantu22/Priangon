"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

const money = (n) => `৳ ${Number(n || 0).toLocaleString("en-BD")}`;

/* ---------------- fetchers ---------------- */
const fetchCategories = async () => {
  const r = await fetch("/api/category");
  const j = await r.json();
  if (!j.success) throw new Error(j.message);
  return j.data;
};

const fetchSubcats = async (category) => {
  const r = await fetch(`/api/subcategory?category=${category}`);
  const j = await r.json();
  if (!j.success) throw new Error(j.message);
  return j.data;
};

const fetchProducts = async (params) => {
  const r = await fetch(`/api/product/products?${params}`);
  const j = await r.json();
  if (!j.success) throw new Error(j.message);
  return j;
};

/* ---------------- page ---------------- */
export default function Pagedemu() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const category = (searchParams.get("category") || "").trim();
  const subcategory = searchParams.getAll("subcategory");
  const q = (searchParams.get("q") || "").trim();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchText, setSearchText] = useState(q);

  /* ---------------- URL helpers ---------------- */
  const pushParams = (params, mode = "push") => {
    const cur = searchParams.toString();
    const next = params.toString();
    if (cur === next) return;
    const url = next ? `/testh?${next}` : "/testh";
    mode === "replace" ? router.replace(url) : router.push(url);
  };

  const setCategory = (v) => {
    const p = new URLSearchParams(searchParams.toString());
    v ? p.set("category", v) : p.delete("category");
    p.delete("subcategory");
    p.set("start", "0");
    pushParams(p);
    setMobileOpen(false);
  };

  const toggleSubcategory = (v) => {
    const p = new URLSearchParams(searchParams.toString());
    const cur = p.getAll("subcategory");
    p.delete("subcategory");
    (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).forEach((x) =>
      p.append("subcategory", x)
    );
    p.set("start", "0");
    pushParams(p);
  };

  const clearAll = () => {
    router.push("/testh");
    setSearchText("");
    setMobileOpen(false);
  };

  /* ---------------- sync search ---------------- */
  useEffect(() => setSearchText(q), [q]);

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(searchParams.toString());
      searchText ? p.set("q", searchText) : p.delete("q");
      p.set("start", "0");
      pushParams(p, "replace");
    }, 300);
    return () => clearTimeout(t);
  }, [searchText]);

  /* ---------------- queries ---------------- */
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: subcats = [] } = useQuery({
    queryKey: ["subcats", category],
    queryFn: () => fetchSubcats(category),
    enabled: !!category,
  });

  const paramsString = useMemo(() => {
    const p = new URLSearchParams(searchParams.toString());
    if (!p.get("start")) p.set("start", "0");
    if (!p.get("size")) p.set("size", "12");
    return p.toString();
  }, [searchParams]);

  const { data, isFetching, error } = useQuery({
    queryKey: ["products", paramsString],
    queryFn: () => fetchProducts(paramsString),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto flex gap-6">
        {/* sidebar */}
        <aside className="w-72 bg-white p-4 rounded-xl shadow hidden lg:block">
          <h3 className="font-extrabold mb-3">Categories</h3>
          {categories.map((c) => (
            <button
              key={c._id}
              onClick={() => setCategory(c.slug)}
              className={`block w-full text-left px-3 py-2 rounded-lg mb-1 font-bold ${
                category === c.slug
                  ? "bg-gray-900 text-white"
                  : "hover:bg-gray-100"
              }`}
            >
              {c.name}
            </button>
          ))}
          <button
            onClick={clearAll}
            className="mt-3 text-sm underline font-bold text-red-600"
          >
            Reset
          </button>
        </aside>

        {/* products */}
        <main className="flex-1">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search..."
            className="w-full mb-4 border rounded-lg px-3 py-2"
          />

          {isFetching && (
            <div className="text-sm font-bold text-gray-500 mb-2">
              Updating products…
            </div>
          )}

          {error && (
            <div className="text-red-600 font-bold mb-2">
              {error.message}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map((p) => (
              <div
                key={p._id}
                className="bg-white rounded-xl shadow overflow-hidden"
              >
                <img
                  src={p?.media?.[0]?.secure_url}
                  className="h-48 w-full object-cover"
                  loading="lazy"
                />
                <div className="p-4">
                  <div className="font-extrabold">{p.name}</div>
                  <div className="mt-2 font-bold text-orange-600">
                    {money(p.sellingPrice)}
                  </div>
                  <button
                    onClick={() => router.push(`/product/${p.slug}`)}
                    className="mt-3 w-full bg-gray-900 text-white py-2 rounded-lg font-bold"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="col-span-full font-bold">
                No products found
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
