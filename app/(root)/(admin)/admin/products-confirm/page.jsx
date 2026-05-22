"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";

export default function WarehousePage() {
  const [stock, setStock] = useState([]);
  const [showrooms, setShowrooms] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [showroomId, setShowroomId] = useState("");
  const [qty, setQty] = useState("");

  // ---------------- LOAD STOCK ----------------
  const loadStock = async () => {
    const res = await axios.get("/api/warehouse-stock");
    console.log("STOCK RES:", res.data);
    setStock(res.data.data || []);
  };

  // ---------------- LOAD SHOWROOMS ----------------
  const loadShowrooms = async () => {
    const res = await axios.get("/api/showrooms");
    setShowrooms(res.data.showrooms || []);
  };

  useEffect(() => {
    loadStock();
    loadShowrooms();
  }, []);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">🏭 Warehouse Stock</h1>

      {/* GRID */}
      <div className="grid grid-cols-4 gap-4">
        {stock.map((item) => (
          <div key={item._id} className="bg-white p-3 rounded shadow">
            <Image
              src={item.productId?.media?.[0]?.secure_url || "/placeholder.png"}
              width={200}
              height={200}
              className="w-full h-32 object-contain"
              alt=""
            />

            <h2 className="font-bold text-sm mt-2">{item.productId?.name}</h2>

            <p className="text-xs text-gray-500">
              {item.variantId?.color} / {item.variantId?.size}
            </p>

            <p className="text-lg font-bold text-green-600">
              Stock: {item.stock}
            </p>

            {/* TRANSFER BUTTON */}
            <button
              onClick={() => setSelectedItem(item)}
              className="bg-blue-600 text-white w-full mt-2 py-1 text-xs"
            >
              Transfer to Showroom
            </button>
          </div>
        ))}
      </div>

      {/* ================= MODAL ================= */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-5 rounded w-[350px]">
            <h2 className="font-bold mb-3">Transfer Stock</h2>

            <p className="text-sm">Product: {selectedItem.productId?.name}</p>

            <p className="text-xs text-gray-500 mb-2">
              Variant: {selectedItem.variantId?.color} /{" "}
              {selectedItem.variantId?.size}
            </p>

            {/* SHOWROOM SELECT */}
            <select
              value={showroomId}
              onChange={(e) => setShowroomId(e.target.value)}
              className="border p-2 w-full mb-2"
            >
              <option value="">Select Showroom</option>

              {showrooms.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* QTY */}
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="border p-2 w-full mb-3"
              placeholder="Quantity"
            />

            {/* ACTION */}
            <button
              onClick={async () => {
                await axios.post("/api/stock/allocate-to-showroom", {
                  showroomId,
                  productId: selectedItem.productId._id,
                  variantId: selectedItem.variantId._id,
                  qty,
                });

                setSelectedItem(null);
                setQty("");
                setShowroomId("");

                alert("Stock transferred successfully");

                loadStock();
              }}
              className="bg-green-600 text-white w-full py-2"
            >
              Transfer
            </button>

            <button
              onClick={() => setSelectedItem(null)}
              className="mt-2 w-full border py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
