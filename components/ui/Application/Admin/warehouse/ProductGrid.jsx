"use client";

import React, { useMemo, useState, useEffect } from "react";
import ProductCard from "./ProductCard";

export default function ProductGrid({
  data = [],
  loading,
  search,
  activeCategory,
  onProductClick,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeCategory]);

  const totalPages = Math.ceil(products.length / itemsPerPage);

  const paginatedProducts = products.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading...</div>;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">No Products Found</div>
    );
  }

  return (
    <>
      <div className="grid xl:grid-cols-5 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-5">
        {paginatedProducts.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            onClick={() => onProductClick(product)}
          />
        ))}
      </div>

      <div className="flex justify-between items-center mt-6 text-sm text-gray-600">
        <span>
          Showing{" "}
          {products.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
          {" - "}
          {Math.min(currentPage * itemsPerPage, products.length)}
          {" of "}
          {products.length} products
        </span>

        <span>
          Page {currentPage} of {totalPages || 1}
        </span>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-10 h-10 rounded-lg border transition ${
                currentPage === i + 1
                  ? "bg-black text-white border-black"
                  : "bg-white hover:bg-gray-100"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
