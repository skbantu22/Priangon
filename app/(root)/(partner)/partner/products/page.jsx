"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Search, Plus, Minus, ShoppingCart, ShieldCheck, PackageSearch } from "lucide-react";
import { usePartnerCart } from "@/components/ui/Application/Partner/PartnerCart";
import { usePartnerBranchId } from "@/lib/partnerBranch";
import { formatWarrantyPeriod } from "@/lib/warranty";
import { skipOptimize } from "@/lib/imageSrc";
import { money } from "@/lib/partnerQueries";
import { showToast } from "@/lib/showToast";

function VariantRow({ product, variant }) {
  const cart = usePartnerCart();
  const [qty, setQty] = useState(1);
  const inCart = cart?.items.find((i) => i.variantId === variant._id)?.qty || 0;
  const available = Math.max(0, variant.stock - inCart);
  const saving = variant.mrp > variant.price ? variant.mrp - variant.price : 0;

  const add = () => {
    if (available <= 0) return;
    const n = Math.min(qty, available);
    cart.add(
      {
        variantId: variant._id,
        productId: product._id,
        name: product.name,
        image: variant.image || product.image,
        color: variant.color,
        size: variant.size,
        price: variant.price,
        stock: variant.stock,
      },
      n,
    );
    setQty(1);
    showToast("success", `${product.name} ×${n} added to your order`);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t py-2.5 first:border-t-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{[variant.size, variant.color].filter(Boolean).join(" · ")}</p>
        <p
          className={`text-xs font-medium ${
            variant.stock <= 0 ? "text-red-500" : variant.stock <= 5 ? "text-amber-600" : "text-emerald-600"
          }`}
        >
          {variant.stock <= 0 ? "Out of stock" : `In stock: ${variant.stock}`}
          {inCart > 0 && <span className="text-primary"> · {inCart} in your order</span>}
        </p>
      </div>
      <div className="text-right">
        <p className="text-base font-bold tabular-nums text-primary">{money(variant.price)}</p>
        {saving > 0 && (
          <p className="text-[11px] text-muted-foreground">
            <span className="line-through">{money(variant.mrp)}</span> · save {money(saving)}
          </p>
        )}
      </div>
      <div className="flex h-9 items-center rounded-lg border">
        <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-full w-8 items-center justify-center text-gray-500 hover:text-primary" disabled={available <= 0}>
          <Minus className="size-3.5" />
        </button>
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          className="h-full w-12 bg-transparent text-center text-sm font-semibold outline-none"
          disabled={available <= 0}
        />
        <button type="button" onClick={() => setQty((q) => Math.min(available || 1, q + 1))} className="flex h-full w-8 items-center justify-center text-gray-500 hover:text-primary" disabled={available <= 0}>
          <Plus className="size-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={add}
        disabled={available <= 0}
        className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        <ShoppingCart className="size-4" /> Add
      </button>
    </div>
  );
}

function PosTile({ product, open, onOpen }) {
  const cart = usePartnerCart();
  const stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
  const prices = product.variants.map((variant) => variant.price).filter((price) => price > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const warranty = product.warranty;
  const warrantyText = warranty?.type !== "none" && warranty?.months > 0 ? formatWarrantyPeriod(warranty.months) : "";
  const stockText = stock <= 0 ? "Out of stock" : stock <= 5 ? `Low Stock (${stock})` : `In Stock (${stock})`;
  const stockClass = stock <= 0 ? "text-red-500" : stock <= 5 ? "text-amber-600" : "text-emerald-600";

  const add = (event) => {
    event.stopPropagation();
    const inStock = product.variants.filter((variant) => variant.stock > 0);
    if (inStock.length !== 1) {
      onOpen();
      return;
    }
    const variant = inStock[0];
    const inCart = cart?.items.find((item) => item.variantId === variant._id)?.qty || 0;
    if (variant.stock - inCart <= 0) return;
    cart.add(
      {
        variantId: variant._id,
        productId: product._id,
        name: product.name,
        image: variant.image || product.image,
        color: variant.color,
        size: variant.size,
        price: variant.price,
        stock: variant.stock,
      },
      1,
    );
    showToast("success", `${product.name} added to your order`);
  };

  return (
    <div
      onClick={onOpen}
      className="group relative flex cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      {product.variants.length > 1 && (
        <span className="absolute right-2 top-2 z-10 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          {product.variants.length} options
        </span>
      )}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-linear-to-b from-violet-50 to-white">
        <Image src={product.image} alt={product.name} fill sizes="180px" className="object-contain p-2" unoptimized={skipOptimize(product.image)} />
      </div>
      {warrantyText && (
        <span className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
          <ShieldCheck className="size-3" /> {warrantyText}
        </span>
      )}
      {product.brand && <p className="mt-2 truncate text-[11px] font-semibold uppercase tracking-wide text-gray-400">{product.brand}</p>}
      <h3 className={`line-clamp-2 min-h-10 text-[14px] font-semibold leading-5 ${product.brand ? "" : "mt-2"}`}>{product.name}</h3>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[17px] font-bold text-primary">
            {money(minPrice)}
            {maxPrice > minPrice && <span className="text-[12px] font-normal"> – {money(maxPrice)}</span>}
          </p>
          <p className={`mt-0.5 text-[12px] font-medium ${stockClass}`}>{stockText}</p>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={stock <= 0}
          title="Add to order"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-md shadow-primary/30 hover:brightness-110 disabled:bg-gray-300"
        >
          <Plus className="size-4" strokeWidth={3} />
        </button>
      </div>
      {open && (
        <div className="mt-2" onClick={(event) => event.stopPropagation()}>
          {product.variants.map((variant) => (
            <VariantRow key={variant._id} product={product} variant={variant} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PartnerProducts() {
  const cart = usePartnerCart();
  const branchId = usePartnerBranchId();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [openId, setOpenId] = useState("");

  useEffect(() => {
    setSearch("");
    setQ("");
    setCategoryId("");
    setSubcategoryId("");
    setBrand("");
  }, [branchId]);

  // search waits until typing stops
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isSuccess, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["partner-products", branchId, q, categoryId, subcategoryId, brand],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        q,
        categoryId,
        subcategoryId,
        brand,
        showroomId: branchId && branchId !== "warehouse" ? branchId : "",
      });
      const { data } = await axios.get(`/api/partner/products?${params}`);
      if (!data.success) throw new Error(data.message);
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: true,
  });

  const head = isSuccess ? data?.pages?.[0] : null;
  const categories = head?.categories || [];
  const brands = head?.brands || [];
  const subcategories = (head?.subcategories || []).filter(
    (row) => !categoryId || String(row.categoryId) === String(categoryId),
  );

  useEffect(() => {
    if (!isSuccess) return;
    if (brand && !brands.some((name) => name.toLowerCase() === brand.toLowerCase())) setBrand("");
    if (categoryId && !categories.some((row) => String(row._id) === String(categoryId))) {
      setCategoryId("");
      setSubcategoryId("");
    }
    if (subcategoryId && !subcategories.some((row) => String(row._id) === String(subcategoryId))) {
      setSubcategoryId("");
    }
  }, [isSuccess, brands, categories, subcategories, brand, categoryId, subcategoryId]);

  const products = isSuccess ? data?.pages.flatMap((p) => p.items) ?? [] : [];
  const chip = (active) =>
    `flex h-10 shrink-0 items-center rounded-lg border px-4 text-[13px] font-medium transition ${
      active ? "border-primary bg-primary text-white shadow-md shadow-primary/30" : "border-gray-200 bg-white text-gray-700 hover:border-primary/50"
    }`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Products &amp; Stock</h1>
          <p className="text-sm text-muted-foreground">
            Prices shown are your own price list. The branch at the top decides which stock you see.
          </p>
        </div>
        {cart?.count > 0 && (
          <Link href="/partner/cart" className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:brightness-110">
            <ShoppingCart className="size-4" /> Review order · {cart.count} pcs · {money(cart.total)}
          </Link>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="categories">
        <button type="button" onClick={() => { setCategoryId(""); setSubcategoryId(""); }} className={chip(!categoryId)}>
          All Products
        </button>
        {categories.map((row) => (
          <button
            key={row._id}
            type="button"
            onClick={() => { setCategoryId(String(row._id)); setSubcategoryId(""); }}
            className={chip(String(categoryId) === String(row._id))}
          >
            {row.name}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="subcategories">
        <button type="button" onClick={() => setSubcategoryId("")} className={chip(!subcategoryId)}>
          All Sub Categories
        </button>
        {subcategories.map((row) => (
          <button
            key={row._id}
            type="button"
            onClick={() => setSubcategoryId(String(row._id))}
            className={chip(String(subcategoryId) === String(row._id))}
          >
            {row.name}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="brands">
        <button type="button" onClick={() => setBrand("")} className={chip(!brand)}>
          All Brands
        </button>
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" />
          </label>
        </div>
        <div className="px-2 pb-3 sm:px-3">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-64 animate-pulse rounded-xl bg-white" />
              ))}
            </div>
          ) : isError ? (
            <p className="py-20 text-center text-sm text-red-500">Could not load products.</p>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-20 text-gray-400">
              <PackageSearch className="size-10" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-3">
                {products.map((product) => (
                  <PosTile
                    key={product._id}
                    product={product}
                    open={openId === String(product._id)}
                    onOpen={() => setOpenId((current) => (current === String(product._id) ? "" : String(product._id)))}
                  />
                ))}
              </div>
              {hasNextPage && (
                <div className="flex justify-center py-4">
                  <button type="button" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="text-xs text-gray-400 hover:text-primary">
                    {isFetchingNextPage ? "Loading more products..." : "Load more"}
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
