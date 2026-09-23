"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useInfiniteQuery, useQuery, keepPreviousData } from "@tanstack/react-query";
import { Search, Loader2, Plus, Minus, ShoppingCart, ShieldCheck, PackageSearch } from "lucide-react";
import { usePartnerCart } from "@/components/ui/Application/Partner/PartnerCart";
import { posBrandsQueryOptions, posCategoriesQueryOptions } from "@/lib/posProducts";
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

function ProductCard({ product }) {
  const w = product.warranty;
  const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
  return (
    <div className="flex flex-col rounded-2xl border bg-card p-4">
      <div className="flex gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-linear-to-b from-violet-50 to-white">
          <Image src={product.image} alt={product.name} fill sizes="80px" className="object-contain p-1" unoptimized={skipOptimize(product.image)} />
        </div>
        <div className="min-w-0">
          {product.brand && <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{product.brand}</p>}
          <h3 className="line-clamp-2 font-semibold leading-5">{product.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{totalStock} pcs in stock</span>
            {w?.type !== "none" && w?.months > 0 && (
              <span className="flex items-center gap-1 text-emerald-700">
                <ShieldCheck className="size-3.5" /> {formatWarrantyPeriod(w.months)} warranty
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="mt-3">
        {product.variants.map((v) => (
          <VariantRow key={v._id} product={product} variant={v} />
        ))}
      </div>
    </div>
  );
}

export default function PartnerProducts() {
  const cart = usePartnerCart();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");

  // search waits until typing stops
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: categories = [] } = useQuery({ ...posCategoriesQueryOptions(), refetchOnWindowFocus: false });
  const { data: brands = [] } = useQuery({ ...posBrandsQueryOptions(), refetchOnWindowFocus: false });

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["partner-products", q, categoryId, brand],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam), q, categoryId, brand });
      const { data } = await axios.get(`/api/partner/products?${params}`);
      if (!data.success) throw new Error(data.message);
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });

  const products = data?.pages.flatMap((p) => p.items) ?? [];
  const selectClass = "h-10 rounded-lg border bg-card px-3 text-sm outline-none focus:border-primary";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Products &amp; Stock</h1>
          <p className="text-sm text-muted-foreground">Prices shown are your own price list.</p>
        </div>
        {cart?.count > 0 && (
          <Link href="/partner/cart" className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:brightness-110">
            <ShoppingCart className="size-4" /> Review order · {cart.count} pcs · {money(cart.total)}
          </Link>
        )}
      </div>

      <div className="grid gap-2 rounded-2xl border bg-card p-3 sm:grid-cols-[1fr_200px_200px]">
        <label className="flex h-10 items-center gap-2 rounded-lg border px-3 focus-within:border-primary">
          <Search className="size-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectClass}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <select value={brand} onChange={(e) => setBrand(e.target.value)} className={selectClass}>
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex h-60 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" /> Loading products...
        </div>
      ) : isError ? (
        <p className="py-20 text-center text-muted-foreground">Could not load products.</p>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
          <PackageSearch className="size-10" /> No products found
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
          {hasNextPage && (
            <div className="flex justify-center">
              <button type="button" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="h-10 rounded-lg border bg-card px-5 text-sm font-semibold hover:border-primary">
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
