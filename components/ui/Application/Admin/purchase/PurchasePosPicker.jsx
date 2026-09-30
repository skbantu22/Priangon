"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Check, PackageSearch, Plus, Search } from "lucide-react";
import { skipOptimize } from "@/lib/imageSrc";
import { money } from "@/components/ui/Application/Admin/supplier/supplierKit";
import { RATES } from "./purchaseKit";

const chip = (active) =>
  `flex h-9 shrink-0 items-center rounded-lg border px-3 text-xs font-medium transition sm:h-10 sm:px-4 sm:text-[13px] ${
    active ? "border-primary bg-primary text-white shadow-md shadow-primary/30" : "border-gray-200 bg-white text-gray-700 hover:border-primary/50"
  }`;

const fetchCatalog = async (showroomId) => {
  if (!showroomId) return { brands: [], categories: [], subcategories: [] };
  const { data } = await axios.get("/api/pos/catalog", { params: { showroomId } });
  if (!data.success) return { brands: [], categories: [], subcategories: [] };
  return {
    brands: data.brands || [],
    categories: data.categories || [],
    subcategories: data.subcategories || [],
  };
};

const fetchProducts = async ({ q, category, subcategory, brand, page, showroomId }) => {
  const params = { page, limit: 24, status: "active", location: showroomId || "all", sort: "name" };
  if (q) params.q = q;
  if (category) params.category = category;
  if (subcategory) params.subcategory = subcategory;
  if (brand) params.brand = brand;
  const { data } = await axios.get("/api/product/list", { params });
  if (!data.success) throw new Error(data.message || "Could not load products");
  return data;
};

/** POS-style picker for a purchase: tap a product card to add that variant to the bill. */
export default function PurchasePosPicker({ onPick, showroomId = "", picked = [] }) {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setSearch("");
    setQ("");
    setCategoryId("");
    setSubcategoryId("");
    setBrand("");
    setPage(1);
  }, [showroomId]);

  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [q, categoryId, subcategoryId, brand]);

  const catalog = useQuery({
    queryKey: ["purchase-pos-catalog", showroomId],
    queryFn: () => fetchCatalog(showroomId),
    enabled: !!showroomId,
  });
  const products = useQuery({
    queryKey: ["purchase-pos-products", showroomId, q, categoryId, subcategoryId, brand, page],
    queryFn: () => fetchProducts({ q, category: categoryId, subcategory: subcategoryId, brand, page, showroomId }),
    enabled: !!showroomId,
  });

  const items = products.data?.items || [];
  const categories = catalog.data?.categories || [];
  const subcategories = (catalog.data?.subcategories || []).filter(
    (row) => !categoryId || String(row.categoryId) === String(categoryId),
  );
  const brands = catalog.data?.brands || [];

  const qtyOf = (variantId) => {
    const row = picked.find((item) => String(item.variantId) === String(variantId));
    return row ? Number(row.quantity) || 0 : 0;
  };

  const addVariant = (product, line) => {
    onPick({
      variantId: String(line._id),
      productName: product.name,
      variantLabel: line.label || "",
      barcode: line.barcode || "",
      stock: line.stock || 0,
      lastCost: line.cost || 0,
      rates: Object.fromEntries(RATES.map(([field]) => [field, Number(line[field]) || 0])),
    });
  };

  return (
    <div className="mb-4 min-w-0 space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="categories">
        <button type="button" onClick={() => { setCategoryId(""); setSubcategoryId(""); }} className={chip(!categoryId)}>
          All Products
        </button>
        {categories.map((row) => (
          <button
            key={row._id}
            type="button"
            onClick={() => { setCategoryId(String(row._id)); setSubcategoryId(""); }}
            className={chip(categoryId === String(row._id))}
          >
            {row.name}
          </button>
        ))}
      </div>

      {categoryId && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="subcategories">
          <button type="button" onClick={() => setSubcategoryId("")} className={chip(!subcategoryId)}>
            All Sub Categories
          </button>
          {subcategories.map((row) => (
            <button key={row._id} type="button" onClick={() => setSubcategoryId(String(row._id))} className={chip(subcategoryId === String(row._id))}>
              {row.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="brands">
        <button type="button" onClick={() => setBrand("")} className={chip(!brand)}>All Brands</button>
        {brands.map((name) => (
          <button key={name} type="button" onClick={() => setBrand(name)} className={chip(brand.toLowerCase() === name.toLowerCase())}>
            {name}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200/70 bg-white/60">
        <div className="p-2 sm:p-3">
          <label className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 focus-within:border-primary">
            <Search className="size-4 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products..."
              className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-[13px]"
            />
          </label>
        </div>
        {picked.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2 pb-2 sm:px-3">
            {picked.map((item) => (
              <span key={item.variantId} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-medium text-emerald-700">
                <Check className="size-3.5" strokeWidth={3} />
                Added · {item.productName}
                {item.variantLabel ? ` · ${item.variantLabel}` : ""} · {item.quantity}
              </span>
            ))}
          </div>
        )}
        <div className="px-2 pb-3 sm:px-3">
          {products.isLoading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-52 animate-pulse rounded-xl bg-white" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
              <PackageSearch className="size-10" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-3">
                {items.map((product) => (
                  <ProductTile key={product._id} product={product} onAdd={addVariant} qtyOf={qtyOf} />
                ))}
              </div>
              {(products.data?.pages || 1) > 1 && (
                <div className="flex items-center justify-center gap-3 py-3 text-xs text-gray-400">
                  <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="hover:text-primary disabled:opacity-40">
                    Previous
                  </button>
                  <span>
                    {page} / {products.data.pages}
                  </span>
                  <button type="button" disabled={page >= products.data.pages} onClick={() => setPage((value) => value + 1)} className="hover:text-primary disabled:opacity-40">
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductTile({ product, onAdd, qtyOf }) {
  const lines = product.variants || [];
  const added = lines.reduce((sum, line) => sum + qtyOf(line._id), 0);
  const [open, setOpen] = useState(lines.length > 1);
  const image = product.image || "/placeholder.png";

  const add = (event) => {
    event.stopPropagation();
    if (lines.length !== 1) {
      setOpen(true);
      return;
    }
    onAdd(product, lines[0]);
  };

  return (
    <div className={`relative flex flex-col rounded-xl border bg-white p-2 sm:p-3 ${added ? "border-emerald-400" : "border-gray-200"}`}>
      {added > 0 && (
        <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          <Check className="size-3" strokeWidth={3} />
          Added {added}
        </span>
      )}
      {lines.length > 1 && (
        <span className="absolute right-2 top-2 z-10 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          {lines.length} options
        </span>
      )}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-linear-to-b from-violet-50 to-white">
        <Image src={image} alt={product.name} fill sizes="160px" className="object-contain p-2" unoptimized={skipOptimize(image)} />
      </div>
      {product.brand && <p className="mt-2 truncate text-[11px] font-semibold uppercase tracking-wide text-gray-400">{product.brand}</p>}
      <h3 className="line-clamp-2 min-h-10 text-[13px] font-semibold leading-5 sm:text-[14px]">{product.name}</h3>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-[12px] text-muted-foreground">Stock {product.totalStock}</p>
        <button
          type="button"
          onClick={add}
          title="Add to this purchase"
          className={`flex size-8 items-center justify-center rounded-lg text-white shadow-md hover:brightness-110 ${
            added && lines.length === 1 ? "bg-emerald-500 shadow-emerald-500/30" : "bg-primary shadow-primary/30"
          }`}
        >
          {added && lines.length === 1 ? <Check className="size-4" strokeWidth={3} /> : <Plus className="size-4" strokeWidth={3} />}
        </button>
      </div>
      {open && lines.length > 1 && (
        <div className="mt-2 space-y-1">
          {lines.map((line) => {
            const qty = qtyOf(line._id);
            return (
              <button
                key={line._id}
                type="button"
                onClick={() => onAdd(product, line)}
                className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-[12px] hover:border-primary ${
                  qty ? "border-emerald-400 bg-emerald-50" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate">{line.label || "Default"}</span>
                  <span className="text-[11px] text-muted-foreground">Stock {line.stock}</span>
                </span>
                <span className="shrink-0 text-right">
                  {qty > 0 && <span className="block text-[11px] font-semibold text-emerald-600">Added {qty}</span>}
                  <span className="font-semibold text-primary">{money(line.cost || line.sellingPrice || 0)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
