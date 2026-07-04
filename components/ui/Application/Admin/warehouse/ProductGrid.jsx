"use client";

import React, { useMemo } from "react";
import ProductCard from "./ProductCard";

export default function ProductGrid({
  data = [],
  loading,
  search,
  activeCategory,
  onProductClick,
}) {
  const products = useMemo(() => {
    const map = new Map();

    data.forEach((item) => {
      const product = item?.productId;

      if (!product?._id) return;

      const category =
        product?.category?.name || product?.category || "Uncategorized";

      // Search Filter
      if (
        search &&
        !product?.name?.toLowerCase().includes(search.toLowerCase())
      ) {
        return;
      }

      // Category Filter
      if (activeCategory !== "ALL" && category !== activeCategory) {
        return;
      }

      if (!map.has(product._id)) {
        map.set(product._id, {
          _id: product._id,
          name: product?.name || "Unnamed Product",
          image: product?.media?.[0]?.secure_url || "/placeholder.png",
          category,
          variants: [],
          totalStock: 0,
          variantCount: 0,
        });
      }

      const p = map.get(product._id);

      p.totalStock += Number(item?.stock || 0);

      p.variants.push(item);

      p.variantCount = p.variants.length;
    });

    return Array.from(map.values());
  }, [data, search, activeCategory]);

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading...</div>;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">No Products Found</div>
    );
  }

  return (
    <div className="grid xl:grid-cols-5 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-5">
      {products.map((product) => (
        <ProductCard
          key={product._id}
          product={product}
          onClick={() => onProductClick(product)}
        />
      ))}
    </div>
  );
}
