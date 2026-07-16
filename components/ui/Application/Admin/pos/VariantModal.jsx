"use client";

import { useState } from "react";

export default function VariantModal({ product, setOpenProduct, addToCart }) {
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

    addToCart(product, selectedVariant, qty);
    setOpenProduct(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6">
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>

        <p className="text-sm text-gray-400 mt-1 mb-5">
          Select the specific configuration to add
        </p>

        {/* Variant List */}
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {product.variants.map((v) => (
            <button
              key={v._id}
              onClick={() => {
                setSelectedVariant(v);
                setQty(1);
              }}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${
                selectedVariant?._id === v._id
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Small Variant Image */}
                <img
                  src={
                    v.image ||
                    product.media?.[0]?.secure_url ||
                    "/placeholder.png"
                  }
                  alt={v.color}
                  className="w-12 h-12 rounded-lg object-cover border"
                />

                <div className="text-left">
                  <p className="font-semibold text-sm">
                    {v.color} / {v.size}
                  </p>

                  <p className="text-xs text-gray-500">৳{v.sellingPrice}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500 font-medium">{v.stock}</p>

                {selectedVariant?._id === v._id && (
                  <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                    ✓
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Quantity */}
        <div className="mt-5 border-t pt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Sale Quantity
          </label>

          <input
            type="number"
            min="1"
            max={selectedVariant?.stock || 1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            className="w-full h-12 rounded-xl border border-gray-200 px-4 text-lg font-semibold outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={() => setOpenProduct(null)}
            className="h-12 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={handleAddToCart}
            className="h-12 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700"
          >
            Add To Cart
          </button>
        </div>
      </div>
    </div>
  );
}
