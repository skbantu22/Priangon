"use client";

import { useState } from "react";

export default function ShowroomTestPage() {
  const showroomId = "showroom1";

  const allproducts = [
    {
      _id: "p1",
      name: "T-Shirt",
      variants: [
        { _id: "v1", color: "Red", size: "M", price: 500 },
        { _id: "v2", color: "Blue", size: "L", price: 550 },
      ],
    },
    {
      _id: "p2",
      name: "Shirt",
      variants: [
        { _id: "v3", color: "White", size: "M", price: 700 },
        { _id: "v4", color: "Black", size: "L", price: 750 },
      ],
    },
  ];

  // 🔥 selected PRODUCTS for showroom
  const selectedProducts = [
    {
      _id: "p1",
      name: "T-Shirt",
      variants: [
        { _id: "v1", color: "Red", size: "M", price: 500 },
        { _id: "v2", color: "Blue", size: "L", price: 550 },
      ],
    },
    {
      _id: "p2",
      name: "Shirt",
      variants: [
        { _id: "v3", color: "White", size: "M", price: 700 },
        { _id: "v4", color: "Black", size: "L", price: 750 },
      ],
    },
  ];

  const [openProduct, setOpenProduct] = useState(null);

  // productId -> [{ variant + qty }]
  const [selected, setSelected] = useState({});

  // ---------------- TOGGLE VARIANT ----------------
  const toggleVariant = (product, variant) => {
    setSelected((prev) => {
      const list = prev[product._id] || [];

      const exists = list.find((v) => v._id === variant._id);

      return {
        ...prev,
        [product._id]: exists
          ? list.filter((v) => v._id !== variant._id)
          : [...list, { ...variant, qty: 1, productName: product.name }],
      };
    });
  };

  // ---------------- QTY UPDATE ----------------
  const updateQty = (productId, variantId, type) => {
    setSelected((prev) => {
      const list = prev[productId] || [];

      return {
        ...prev,
        [productId]: list.map((item) => {
          if (item._id !== variantId) return item;

          const newQty =
            type === "inc" ? item.qty + 1 : item.qty > 1 ? item.qty - 1 : 1;

          return { ...item, qty: newQty };
        }),
      };
    });
  };

  // ---------------- REMOVE ITEM ----------------
  const removeItem = (productId, variantId) => {
    setSelected((prev) => {
      const list = prev[productId] || [];

      return {
        ...prev,
        [productId]: list.filter((v) => v._id !== variantId),
      };
    });
  };

  // ---------------- CHECKOUT ----------------
  const checkout = () => {
    console.log("SHOWROOM:", showroomId);
    console.log("ORDER:", selected);

    alert("Checkout Done (Check Console)");
  };

  // ---------------- TOTAL CALC ----------------
  const total = Object.values(selected)
    .flat()
    .reduce((sum, v) => sum + v.price * v.qty, 0);

  return (
    <div className="p-6 grid grid-cols-3 gap-6">
      {/* ================= LEFT: PRODUCTS ================= */}
      <div className="col-span-2">
        <h1 className="text-xl font-bold mb-4">Product List</h1>

        <div className="grid grid-cols-2 gap-4">
          {allproducts.map((p) => (
            <div key={p._id} className="border p-3 rounded">
              <h2 className="font-semibold">{p.name}</h2>

              <button
                onClick={() => setOpenProduct(p)}
                className="bg-blue-500 text-white px-3 py-1 mt-2"
              >
                View Variants
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ================= RIGHT: CART ================= */}
      <div className="border p-4 rounded h-fit">
        <h1 className="font-bold text-lg mb-3">POS CART</h1>

        {Object.keys(selected).length === 0 && (
          <p className="text-gray-500">No items selected</p>
        )}

        {Object.entries(selected).map(([pid, variants]) => (
          <div key={pid} className="mb-4">
            <h2 className="font-semibold mb-2">{variants[0]?.productName}</h2>

            {variants.map((v) => (
              <div key={v._id} className="text-sm border p-2 mb-2">
                <div>
                  {v.color} - {v.size} - ৳{v.price}
                </div>

                <div className="flex gap-2 items-center mt-1">
                  <button
                    onClick={() => updateQty(pid, v._id, "dec")}
                    className="px-2 bg-gray-300"
                  >
                    -
                  </button>

                  <span>{v.qty}</span>

                  <button
                    onClick={() => updateQty(pid, v._id, "inc")}
                    className="px-2 bg-gray-300"
                  >
                    +
                  </button>

                  <button
                    onClick={() => removeItem(pid, v._id)}
                    className="ml-2 text-red-500"
                  >
                    remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

        <hr className="my-3" />

        <div className="font-bold text-lg">Total: ৳{total}</div>

        <button
          onClick={checkout}
          className="bg-green-600 text-white w-full mt-3 py-2"
        >
          Checkout
        </button>
      </div>

      {/* ================= POPUP ================= */}
      {openProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white w-[400px] p-5 rounded">
            <h2 className="font-bold mb-3">{openProduct.name}</h2>

            {openProduct.variants.map((v) => {
              const isSelected = selected[openProduct._id]?.find(
                (x) => x._id === v._id,
              );

              return (
                <div
                  key={v._id}
                  onClick={() => toggleVariant(openProduct, v)}
                  className={`p-2 border mb-2 cursor-pointer ${
                    isSelected ? "bg-green-200" : ""
                  }`}
                >
                  {v.color} - {v.size} - ৳{v.price}
                </div>
              );
            })}

            <button
              onClick={() => setOpenProduct(null)}
              className="mt-3 bg-gray-500 text-white px-3 py-1"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
