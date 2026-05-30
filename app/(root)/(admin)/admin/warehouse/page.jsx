"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";

export default function WarehousePage() {
  const [data, setData] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [tab, setTab] = useState("stock");

  // EDIT MODAL
  const [editItem, setEditItem] = useState(null);
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");

  // ================= LOAD STOCK =================
  const loadStock = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/warehouse-stock");
      console.log("STOCK RES:", res.data);
      setData(res.data?.data || []);
    } catch (err) {
      console.log("STOCK ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  // ================= LOAD HISTORY =================
  const loadHistory = async () => {
    try {
      const res = await axios.get("/api/inventory/history");
      setHistory(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.log("HISTORY ERROR:", err);
    }
  };

  // INIT
  useEffect(() => {
    loadStock();
  }, []);

  // LOAD HISTORY ONLY WHEN TAB OPEN
  useEffect(() => {
    if (tab === "history") {
      loadHistory();
    }
  }, [tab]);

  // ================= FILTER =================
  const filtered = data.filter((item) => {
    const name = item.productId?.name || "";
    const variant = `${item.variantId?.color || ""} ${item.variantId?.size || ""}`;

    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      variant.toLowerCase().includes(search.toLowerCase())
    );
  });

  // ================= UPDATE STOCK =================
  const updateStock = async (type) => {
    try {
      if (!editItem) return;

      const qtyNumber = Number(qty);

      if (!qtyNumber || qtyNumber <= 0) {
        alert("Enter valid quantity");
        return;
      }

      await axios.patch("/api/warehouse-stock/update", {
        id: editItem._id,
        qty: qtyNumber,
        type, // add | remove
        note,
      });

      setEditItem(null);
      setQty("");
      setNote("");

      loadStock();
      if (tab === "history") loadHistory();
    } catch (err) {
      console.log("UPDATE ERROR:", err.response?.data || err.message);
      alert("Update failed");
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">🏭 Warehouse System</h1>

        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="border p-2 rounded"
          />

          <button
            onClick={() => setTab("stock")}
            className={`px-3 py-1 border ${tab === "stock" ? "bg-black text-white" : ""}`}
          >
            Stock
          </button>

          <button
            onClick={() => setTab("history")}
            className={`px-3 py-1 border ${tab === "history" ? "bg-black text-white" : ""}`}
          >
            History
          </button>
        </div>
      </div>

      {/* ================= STOCK ================= */}
      {tab === "stock" && (
        <div className="grid grid-cols-4 gap-4">
          {loading ? (
            <p>Loading...</p>
          ) : (
            filtered.map((item) => (
              <div
                key={item._id}
                className="bg-white p-4 rounded shadow border"
              >
                <Image
                  src={
                    item.variantId?.media?.[0]?.secure_url ||
                    item.productId?.media?.[0]?.secure_url ||
                    "/placeholder.png"
                  }
                  width={200}
                  height={200}
                  className="w-full h-32 object-contain"
                  alt=""
                />

                <h2 className="font-bold text-sm">{item.productId?.name}</h2>

                <p className="text-xs text-gray-500">
                  {item.variantId?.color} / {item.variantId?.size}
                </p>

                <div className="mt-2">
                  <p className="text-2xl font-bold text-green-600">
                    {item.stock}
                  </p>
                  <p className="text-xs text-gray-400">
                    Reserved: {item.reservedStock || 0}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditItem(item);
                    setQty("");
                    setNote("");
                  }}
                  className="mt-2 w-full bg-black text-white py-1 text-xs"
                >
                  Edit Stock
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ================= HISTORY ================= */}
      {tab === "history" && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <p className="text-gray-500">No history found</p>
          ) : (
            history.map((h) => (
              <div key={h._id} className="bg-white p-3 rounded shadow text-sm">
                <div className="flex justify-between">
                  <p className="font-bold">{h.type}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(h.createdAt).toLocaleString()}
                  </p>
                </div>

                <p>
                  {h.productId?.name} → {h.variantId?.color} /{" "}
                  {h.variantId?.size}
                </p>

                <p>Qty: {h.quantity}</p>
                <p className="text-gray-500 text-xs">{h.note}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* ================= EDIT MODAL ================= */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-5 rounded w-[380px]">
            <h2 className="font-bold mb-2">Stock Management</h2>

            <p className="text-sm mb-1">Product: {editItem.productId?.name}</p>

            <p className="text-xs mb-2 text-gray-500">
              Variant: {editItem.variantId?.color} / {editItem.variantId?.size}
            </p>

            <p className="text-sm mb-2 font-bold">
              Current Stock: {editItem.stock}
            </p>

            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="border p-2 w-full mb-3"
              placeholder="Enter quantity"
            />

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="border p-2 w-full mb-3"
              placeholder="Note (optional)"
            />

            {/* ACTIONS */}
            <div className="flex gap-2">
              <button
                onClick={() => updateStock("add")}
                className="bg-green-600 text-white px-3 py-2 flex-1"
              >
                ➕ Add Stock
              </button>

              <button
                onClick={() => updateStock("remove")}
                className="bg-red-600 text-white px-3 py-2 flex-1"
              >
                ➖ Decrease
              </button>
            </div>

            <button
              onClick={() => setEditItem(null)}
              className="mt-3 w-full border py-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
