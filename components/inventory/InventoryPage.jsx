"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [showrooms, setShowrooms] = useState([]);
  const [showroomId, setShowroomId] = useState("");
  const [loading, setLoading] = useState(false);

  // ---------------- LOAD SHOWROOMS ----------------
  useEffect(() => {
    const loadShowrooms = async () => {
      try {
        const res = await axios.get("/api/showrooms");
        setShowrooms(res.data.showrooms || []);
      } catch (err) {
        console.log(err);
      }
    };

    loadShowrooms();
  }, []);

  // ---------------- LOAD INVENTORY ----------------
  useEffect(() => {
    if (!showroomId) return;
    loadInventory();
  }, [showroomId]);

  const loadInventory = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `/api/inventory/stock?showroomId=${showroomId}`,
      );

      setInventory(res.data.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- INCREASE STOCK ----------------
  const increase = async (item) => {
    const qty = Number(prompt("Add Quantity"));
    if (!qty) return;

    await axios.post("/api/inventory/increase", {
      showroomId,
      productId: item.productId,
      variantId: item.variantId,
      quantity: qty,
    });

    loadInventory();
  };

  // ---------------- DECREASE STOCK ----------------
  const decrease = async (item) => {
    const qty = Number(prompt("Reduce Quantity"));
    if (!qty) return;

    await axios.post("/api/inventory/decrease", {
      showroomId,
      productId: item.productId,
      variantId: item.variantId,
      quantity: qty,
    });

    loadInventory();
  };

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-5">Inventory Management</h1>

      {/* SHOWROOM SELECT */}
      <div className="mb-4">
        <select
          value={showroomId}
          onChange={(e) => setShowroomId(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Select Showroom</option>
          {showrooms.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {!showroomId ? (
        <p className="text-gray-500">Select showroom first</p>
      ) : loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {inventory.map((item) => (
            <div key={item._id} className="border rounded-xl p-4">
              {/* CLEAN DISPLAY */}
              <h2 className="font-semibold text-sm">
                Variant: {item.variantId.slice(-6)}
              </h2>

              <p className="text-3xl font-bold">{item.stock}</p>

              <p className="text-xs text-gray-500">
                Reserved: {item.reservedStock || 0}
              </p>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => increase(item)}
                  className="bg-green-500 text-white px-3 py-1 rounded"
                >
                  + Stock
                </button>

                <button
                  onClick={() => decrease(item)}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  - Stock
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
