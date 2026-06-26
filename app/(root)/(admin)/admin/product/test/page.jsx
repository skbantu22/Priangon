"use client";

import { useState } from "react";

import ProductDashboard from "@/components/ui/Application/Admin/products/ProductDashboard";
import VariantManager from "@/components/ui/Application/Admin/products/modals/VariantManager";

export default function ProductsPage() {
  const [view, setView] = useState("dashboard");
  const [activeProduct, setActiveProduct] = useState(null);

  const [products, setProducts] = useState([
    {
      id: 1,
      title: "Vintage Denim Jacket",
      category: "Outerwear",
      variants: [
        {
          id: 101,
          name: "Small / Blue",
          sku: "DEN-BLU-S",
          price: "49.99",
          stock: 10,
          images: [],
        },
      ],
    },
  ]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between mb-6">
          <h1 className="text-2xl font-bold">Product Manager</h1>

          {view === "variants" && (
            <button
              onClick={() => setView("dashboard")}
              className="text-blue-600 underline"
            >
              ← Back
            </button>
          )}
        </div>

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <ProductDashboard
            products={products}
            setProducts={setProducts}
            setView={setView}
            setActiveProduct={setActiveProduct}
          />
        )}

        {/* VARIANTS */}
        {view === "variants" && activeProduct && (
          <VariantManager
            product={activeProduct}
            products={products}
            setProducts={setProducts}
          />
        )}
      </div>
    </div>
  );
}
