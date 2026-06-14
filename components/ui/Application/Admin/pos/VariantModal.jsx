"use client";

import { useState } from "react";

export default function VariantModal({ product, setOpenProduct, setCart }) {
  const [selectedVariant, setSelectedVariant] = useState(
    product?.variants?.[0] || null,
  );
  const [qty, setQty] = useState(1);

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    if (qty > selectedVariant.stock) {
      alert("Not enough stock");
      return;
    }

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.variantId === selectedVariant._id,
      );

      if (existing) {
        return prev.map((item) =>
          item.variantId === selectedVariant._id
            ? { ...item, qty: item.qty + qty }
            : item,
        );
      }

      return [
        ...prev,
        {
          _id: `${product._id}-${selectedVariant._id}`,
          productId: product._id,
          variantId: selectedVariant._id,

          name: product.name,
          color: selectedVariant.color,
          size: selectedVariant.size,

          price: selectedVariant.sellingPrice,
          qty,

          image: product.media?.[0]?.secure_url || "/placeholder.png",
        },
      ];
    });

    setOpenProduct(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6">
        <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>

        <p className="text-sm text-gray-400 mt-1 mb-5">
          Select the specific configuration to add
        </p>

        <div className="space-y-2">
          {product.variants.map((v) => (
            <button
              key={v._id}
              onClick={() => setSelectedVariant(v)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                selectedVariant?._id === v._id
                  ? "bg-green-50 border-green-300 text-green-800"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span className="font-semibold">
                {v.color} / {v.size}
              </span>

              <span className="text-gray-500 font-medium">
                Stock: {v.stock}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 border-t pt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Sale Quantity
          </label>

          <input
            type="number"
            min="1"
            max={selectedVariant?.stock || 1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="w-full h-14 rounded-2xl border border-gray-200 px-4 text-lg font-semibold outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={() => setOpenProduct(null)}
            className="h-14 rounded-2xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
          >
            Discard
          </button>

          <button
            onClick={handleAddToCart}
            className="h-14 rounded-2xl bg-green-600 text-white font-bold hover:bg-green-700"
          >
            Put in Bag
          </button>
        </div>
      </div>
    </div>
  );
}
