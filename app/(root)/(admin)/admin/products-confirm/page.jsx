"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { toast } from "sonner";

export default function AdvancedInventoryDashboard() {
  const [stock, setStock] = useState([]);
  const [showrooms, setShowrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState({});
  const [editedStock, setEditedStock] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [warehouseRes, overviewRes, showroomRes] = await Promise.all([
        axios.get("/api/warehouse-stock"),
        axios.get("/api/stock/stock-overview"),
        axios.get("/api/showrooms"),
      ]);

      const rawStock = warehouseRes.data.data || [];
      setStock(rawStock);

      const rawShowrooms =
        showroomRes.data.showrooms || showroomRes.data.data || [];
      const overviewData = overviewRes.data.data || [];

      // ✅ CRITICAL FIX: ডাটাবেজের 'name' ফিল্ডকে ম্যাপ করা এবং ওভারভিউ স্টক ইন্টিগ্রেট করা
      const mergedShowrooms = rawShowrooms.map((sr) => {
        const matchedOverview = overviewData.find(
          (ov) => String(ov._id) === String(sr._id),
        );
        return {
          ...sr,
          name: sr.name || "Unknown Showroom",
          items: matchedOverview ? matchedOverview.items : sr.items || [],
        };
      });

      setShowrooms(mergedShowrooms);

      const initialExpanded = {};
      rawStock.forEach((item) => {
        if (item.productId?._id) {
          initialExpanded[item.productId._id] = true;
        }
      });
      setExpandedProducts(initialExpanded);
    } catch (err) {
      console.error("Dashboard synchronization failed:", err);
      toast.error("Failed to sync dashboard indices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const toggleProduct = (productId) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // ✅ FIX: হ্যান্ডলারগুলোতে নামের বদলে ইউনিক `showroomId` ব্যবহার করা হয়েছে
  const handleQtyChange = (variantStockId, showroomId, value) => {
    setEditedStock((prev) => ({
      ...prev,
      [`${variantStockId}_${showroomId}`]: value,
    }));
  };

  const handleSyncProductFamily = async (productId) => {
    const familyVariants = stock.filter(
      (item) => item.productId?._id === productId,
    );
    const payloads = [];

    familyVariants.forEach((item) => {
      showrooms.forEach((s) => {
        const key = `${item._id}_${s._id}`;
        if (editedStock[key] !== undefined && editedStock[key] !== "") {
          payloads.push({
            showroomId: s._id,
            productId: item.productId?._id,
            variantId: item.variantId?._id,
            qty: Number(editedStock[key]),
          });
        }
      });
    });

    if (payloads.length === 0) {
      toast.error("No changes detected within this product family.");
      return;
    }

    try {
      await Promise.all(
        payloads.map((p) => axios.post("/api/stock/allocate-to-showroom", p)),
      );
      setEditedStock((prev) => {
        const copy = { ...prev };
        familyVariants.forEach((item) => {
          showrooms.forEach((s) => delete copy[`${item._id}_${s._id}`]);
        });
        return copy;
      });
      toast.success("Successfully dispatched stock allocations!");
      loadDashboardData();
    } catch (err) {
      console.error(err);
      toast.error("Stock synchronization failed.");
    }
  };

  const handleReturnStock = async (showroom, product, variant) => {
    const qty = prompt(
      `Enter Return Quantity for ${showroom.name || "Showroom"}:`,
    );
    if (!qty || Number(qty) <= 0) return;

    try {
      await axios.post("/api/stock/return-to-warehouse", {
        showroomId: showroom._id,
        productId: product._id,
        variantId: variant.variantId?._id,
        qty: Number(qty),
      });

      toast.success("Stock Returned Successfully");
      loadDashboardData();
    } catch (err) {
      console.error(err);
      toast.error("Return Failed");
    }
  };

  const handleSaveAll = async () => {
    const keys = Object.keys(editedStock).filter((k) => editedStock[k] !== "");
    if (keys.length === 0) {
      toast.error("No pending stock modifications found.");
      return;
    }

    setIsSaving(true);
    try {
      const requests = [];
      stock.forEach((item) => {
        showrooms.forEach((s) => {
          const key = `${item._id}_${s._id}`;
          if (editedStock[key] !== undefined && editedStock[key] !== "") {
            requests.push(
              axios.post("/api/stock/allocate-to-showroom", {
                showroomId: s._id,
                productId: item.productId?._id,
                variantId: item.variantId?._id,
                qty: Number(editedStock[key]),
              }),
            );
          }
        });
      });

      await Promise.all(requests);
      setEditedStock({});
      toast.success("All SKU balances successfully matched system-wide.");
      loadDashboardData();
    } catch (err) {
      console.error(err);
      toast.error("Global ledger batch update failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const groupedStock = stock.reduce((acc, current) => {
    const pId = current.productId?._id;
    if (!pId) return acc;
    if (!acc[pId]) {
      acc[pId] = { product: current.productId, variants: [] };
    }
    acc[pId].variants.push(current);
    return acc;
  }, {});

  const hasPendingChanges = Object.keys(editedStock).some(
    (k) => editedStock[k] !== "",
  );

  return (
    <div className="w-full min-h-screen bg-[#f0f4f2] text-[#1e293b] font-sans antialiased p-4 md:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1e2e2a] text-[#f8fafc] p-6 rounded-xl border border-[#2d423e] shadow-md">
          <div>
            <h1 className="text-xl font-black tracking-tight">
              Advanced Inventory Matrix
            </h1>
            <p className="text-xs text-[#a3b899] font-medium mt-1">
              Live multi-showroom stock dispatch
            </p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <button
              onClick={loadDashboardData}
              className="text-[#f8fafc] border border-[#3e5954] text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#39534e] transition-all"
            >
              Refresh Data
            </button>
            <button
              onClick={handleSaveAll}
              disabled={!hasPendingChanges || isSaving}
              className={`text-xs font-extrabold px-5 py-2 rounded-lg transition-all text-white shadow-sm ${
                !hasPendingChanges
                  ? "bg-gray-600 cursor-not-allowed opacity-50"
                  : "bg-emerald-600 hover:bg-emerald-700 border border-emerald-500"
              }`}
            >
              {isSaving ? "Saving..." : "Commit Global Matrix"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-[#cbd5e1] p-24 text-center shadow-sm">
            <div className="inline-block w-8 h-8 border-4 border-[#14532d] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold text-[#334155]">
              Syncing indices...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.values(groupedStock).map(({ product, variants }) => {
              const isExpanded = !!expandedProducts[product._id];
              const totalWarehouseStock = variants.reduce(
                (acc, curr) => acc + curr.stock,
                0,
              );

              return (
                <div
                  key={`product-card-${product._id}`}
                  className="bg-white border border-[#cbd5e1] rounded-xl shadow-sm overflow-hidden"
                >
                  {/* Accordion Trigger Header */}
                  <div
                    onClick={() => toggleProduct(product._id)}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-[#e2e8f0]"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-[#64748b] text-sm font-bold transition-transform duration-200 ${isExpanded ? "rotate-90 text-emerald-700" : ""}`}
                      >
                        ➔
                      </span>
                      {product.media?.[0]?.secure_url && (
                        <div className="w-12 h-16 relative flex-shrink-0 border border-[#cbd5e1] rounded-lg bg-gray-100 overflow-hidden">
                          <Image
                            src={product.media[0].secure_url}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="text-base font-extrabold text-[#0f172a]">
                            {product.name}
                          </h2>
                          <span className="text-[11px] px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-bold border border-emerald-200">
                            {variants.length} Variants
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4">
                      <div className="bg-gray-100 px-4 py-1.5 rounded-lg border border-gray-200 text-center">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 block font-bold">
                          Warehouse Stock
                        </span>
                        <span className="text-sm font-black text-emerald-800">
                          {totalWarehouseStock} Pcs
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSyncProductFamily(product._id);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm"
                      >
                        Save Family
                      </button>
                    </div>
                  </div>

                  {/* Nested Inventory Matrix */}
                  {isExpanded && (
                    <div className="p-4 bg-[#f8faf9]">
                      {/* Desktop Grid Layout */}
                      <div className="hidden lg:block overflow-x-auto border border-gray-200 rounded-xl bg-white shadow-sm">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="bg-[#1e2e2a] text-[#e2efe9] text-[11px] font-bold uppercase tracking-wider">
                              <th className="p-4 font-extrabold">
                                SKU Layout Matrix
                              </th>
                              <th className="p-4 text-center bg-[#243732] font-extrabold w-[160px]">
                                🏭 Main Warehouse
                              </th>
                              {showrooms.map((s) => (
                                <th
                                  key={`header-showroom-${s._id}`}
                                  className="p-4 font-extrabold bg-[#223530] text-center border-l border-[#2d423e]"
                                >
                                  🏢 {s.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {variants.map((vItem) => (
                              <tr
                                key={`row-variant-${vItem._id}`}
                                className="hover:bg-gray-50/50 transition-all"
                              >
                                <td className="p-4 font-bold text-gray-900">
                                  <div className="flex items-center gap-2">
                                    {vItem.variantId?.media?.[0]
                                      ?.secure_url && (
                                      <div className="w-8 h-10 relative border rounded bg-white overflow-hidden">
                                        <Image
                                          src={
                                            vItem.variantId.media[0].secure_url
                                          }
                                          alt=""
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                    )}
                                    <span>
                                      {vItem.variantId?.color || "Standard"}{" "}
                                      &bull; {vItem.variantId?.size || "UNI"}
                                    </span>
                                  </div>
                                </td>

                                <td className="p-4 text-center border-r border-gray-100">
                                  <span
                                    className={`inline-block px-3 py-1 rounded-full font-bold text-xs ${vItem.stock > 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
                                  >
                                    {vItem.stock} pcs
                                  </span>
                                </td>

                                {showrooms.map((showroom) => {
                                  const cellKey = `${vItem._id}_${showroom._id}`;
                                  const currentStock =
                                    showroom.items?.find(
                                      (si) =>
                                        String(si.productId) ===
                                          String(product._id) &&
                                        String(si.variantId) ===
                                          String(vItem.variantId?._id),
                                    )?.stock || 0;
                                  const pendingValue =
                                    editedStock[cellKey] !== undefined
                                      ? editedStock[cellKey]
                                      : "";

                                  return (
                                    <td
                                      key={`cell-show-${vItem._id}-${showroom._id}`}
                                      className="p-3 border-l border-gray-100 text-center min-w-[200px]"
                                    >
                                      <div className="flex items-center justify-center gap-2">
                                        <div className="text-left leading-tight pr-1">
                                          <span className="text-[10px] text-gray-400 block font-semibold">
                                            STOCK
                                          </span>
                                          <span className="text-xs font-bold text-gray-700">
                                            {currentStock}
                                          </span>
                                        </div>
                                        <input
                                          type="number"
                                          placeholder="0"
                                          min="0"
                                          value={pendingValue}
                                          onChange={(e) =>
                                            handleQtyChange(
                                              vItem._id,
                                              showroom._id,
                                              e.target.value,
                                            )
                                          }
                                          className={`w-14 border rounded px-1.5 py-1 text-center font-bold text-xs transition-all ${
                                            pendingValue !== ""
                                              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                              : "border-gray-300"
                                          }`}
                                        />
                                        <button
                                          onClick={() =>
                                            handleReturnStock(
                                              showroom,
                                              product,
                                              vItem,
                                            )
                                          }
                                          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2 py-1 rounded font-bold text-[11px] transition-all"
                                        >
                                          Return
                                        </button>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View Layout */}
                      <div className="lg:hidden space-y-3">
                        {variants.map((vItem) => (
                          <div
                            key={`mob-variant-${vItem._id}`}
                            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3"
                          >
                            <div className="flex items-center justify-between border-b pb-2">
                              <span className="font-extrabold text-sm text-gray-900">
                                {vItem.variantId?.color || "Standard"} /{" "}
                                {vItem.variantId?.size || "UNI"}
                              </span>
                              <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                                WH: {vItem.stock}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {showrooms.map((showroom) => {
                                const cellKey = `${vItem._id}_${showroom._id}`;
                                const currentStock =
                                  showroom.items?.find(
                                    (si) =>
                                      String(si.productId) ===
                                        String(product._id) &&
                                      String(si.variantId) ===
                                        String(vItem.variantId?._id),
                                  )?.stock || 0;
                                const pendingValue =
                                  editedStock[cellKey] !== undefined
                                    ? editedStock[cellKey]
                                    : "";

                                return (
                                  <div
                                    key={`mob-cell-${vItem._id}-${showroom._id}`}
                                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200"
                                  >
                                    <div>
                                      <span className="text-xs font-bold text-gray-800 block">
                                        🏢 {showroom.name}
                                      </span>
                                      <span className="text-[11px] text-gray-500">
                                        In Store: {currentStock}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="number"
                                        placeholder="0"
                                        value={pendingValue}
                                        onChange={(e) =>
                                          handleQtyChange(
                                            vItem._id,
                                            showroom._id,
                                            e.target.value,
                                          )
                                        }
                                        className={`border rounded px-2 py-1 text-center w-14 text-xs font-bold ${
                                          pendingValue !== ""
                                            ? "border-emerald-500 bg-emerald-50"
                                            : "border-gray-300"
                                        }`}
                                      />
                                      <button
                                        onClick={() =>
                                          handleReturnStock(
                                            showroom,
                                            product,
                                            vItem,
                                          )
                                        }
                                        className="bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded text-[11px] font-bold"
                                      >
                                        Return
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
