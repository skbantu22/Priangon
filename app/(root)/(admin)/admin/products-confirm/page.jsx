"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";

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
      const [warehouseRes, showroomRes] = await Promise.all([
        axios.get("/api/warehouse-stock"),
        axios.get("/api/stock/stock-overview"),
      ]);

      const rawStock = warehouseRes.data.data || [];
      setStock(rawStock);

      const overview = showroomRes.data.data || [];
      const showroomData = overview.filter((x) => x.showroom !== "Warehouse");
      setShowrooms(showroomData);

      const initialExpanded = {};
      rawStock.forEach((item) => {
        if (item.productId?._id) {
          initialExpanded[item.productId._id] = true;
        }
      });
      setExpandedProducts(initialExpanded);
    } catch (err) {
      console.error("Dashboard synchronization failed:", err);
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

  const handleQtyChange = (variantStockId, showroomName, value) => {
    setEditedStock((prev) => ({
      ...prev,
      [`${variantStockId}_${showroomName}`]: value,
    }));
  };

  const handleSyncProductFamily = async (productId) => {
    const familyVariants = stock.filter(
      (item) => item.productId?._id === productId,
    );
    const payloads = [];

    familyVariants.forEach((item) => {
      showrooms.forEach((s) => {
        const key = `${item._id}_${s.showroom}`;
        if (editedStock[key] !== undefined && editedStock[key] !== "") {
          payloads.push({
            showroomId: s._id || s.showroom,
            productId: item.productId?._id,
            variantId: item.variantId?._id,
            qty: Number(editedStock[key]),
          });
        }
      });
    });

    if (payloads.length === 0) {
      alert("No changes detected within this product family.");
      return;
    }

    try {
      await Promise.all(
        payloads.map((p) => axios.post("/api/stock/allocate-to-showroom", p)),
      );
      setEditedStock((prev) => {
        const copy = { ...prev };
        familyVariants.forEach((item) => {
          showrooms.forEach((s) => delete copy[`${item._id}_${s.showroom}`]);
        });
        return copy;
      });
      alert(
        "Successfully dispatched stock allocations for this product family.",
      );
      loadDashboardData();
    } catch (err) {
      console.error(err);
      alert("Stock synchronization failed.");
    }
  };

  const handleSaveAll = async () => {
    const keys = Object.keys(editedStock).filter((k) => editedStock[k] !== "");
    if (keys.length === 0) {
      alert("No pending stock modifications found.");
      return;
    }

    setIsSaving(true);
    try {
      const requests = [];
      stock.forEach((item) => {
        showrooms.forEach((s) => {
          const key = `${item._id}_${s.showroom}`;
          if (editedStock[key] !== undefined && editedStock[key] !== "") {
            requests.push(
              axios.post("/api/stock/allocate-to-showroom", {
                showroomId: s._id || s.showroom,
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
      alert("All SKU balances successfully matched system-wide.");
      loadDashboardData();
    } catch (err) {
      console.error(err);
      alert("Global ledger batch update failed.");
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

  const hasPendingChanges = Object.keys(editedStock).length > 0;

  return (
    <div className="w-full min-h-screen bg-[#f0f4f2] text-[#1e293b] tracking-normal font-sans antialiased p-4 md:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* High Contrast Deep Slate Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black text-[#f8fafc] p-6  border border-[#2d423e] shadow-md">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight font-sans text-white">
              Inventory Allocation Engine
            </h1>
            <p className="text-xs text-[#a3b899] font-medium mt-1">
              Live multi-showroom stock dispatch
            </p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <button
              onClick={loadDashboardData}
              className="bg-white text-[#f8fafc] border border-[#3e5954] text-xs font-bold px-4 py-2  hover:bg-[#39534e] transition-all"
            >
              Refresh
            </button>
            <button
              onClick={handleSaveAll}
              disabled={!hasPendingChanges || isSaving}
              className={`text-xs font-extrabold px-5 py-2 rounded-lg transition-all text-white shadow-sm ${
                !hasPendingChanges
                  ? "bg-green-500 cursor-not-allowed shadow-none border border-[#374f4b]"
                  : "bg-[#10b981] hover:bg-[#059669] border border-[#10b981]"
              }`}
            >
              {isSaving ? "Saving Updates..." : "Commit Global Matrix"}
            </button>
          </div>
        </div>

        {/* LOADING SCREEN */}
        {loading ? (
          <div className="bg-white rounded-xl border border-[#cbd5e1] p-24 text-center shadow-sm">
            <div className="inline-block w-8 h-8 border-4 border-[#14532d] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold text-[#334155] tracking-wide">
              Syncing product indices...
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
                  className="bg-zinc-100 border border-[#cbd5e1] shadow-[0_4px_12px_rgba(0,0,0,0.02)] overflow-hidden"
                >
                  {/* ACCORDION BAR */}
                  <div
                    onClick={() => toggleProduct(product._id)}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#f8faf9] transition-colors select-none border-b border-[#e2e8f0]"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-[#64748b] text-sm font-bold transition-transform duration-200 hidden md:inline-block ${isExpanded ? "rotate-90 text-[#14532d]" : ""}`}
                      >
                        ➔
                      </span>
                      {product.media?.[0]?.secure_url && (
                        <div className="w-12 h-16 relative flex-shrink-0 border border-[#cbd5e1] rounded-lg bg-[#f1f5f9] p-0.5">
                          <Image
                            src={product.media[0].secure_url}
                            alt=""
                            fill
                            className="object-cover rounded-md"
                          />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="text-base font-extrabold text-[#0f172a] tracking-tight">
                            {product.name}
                          </h2>
                          <span className="text-[11px] px-2.5 py-0.5 bg-[#e2efe9] text-[#14532d] rounded-md font-bold tracking-wide border border-[#cbdad2]">
                            {variants.length} Variants Listed
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748b] mt-1 font-medium md:hidden">
                          Tap to inspect columns
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 border-t border-[#f1f5f9] pt-3 md:pt-0 md:border-none">
                      <div className="text-left md:text-right bg-[#f1f5f3] px-4 py-2 rounded-lg border border-[#e2e8f0]">
                        <span className="text-[10px] uppercase tracking-wider text-[#64748b] block font-extrabold">
                          Depot Storage
                        </span>
                        <span className="text-base font-black text-[#14532d]">
                          {totalWarehouseStock} Pcs
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSyncProductFamily(product._id);
                        }}
                        className="bg-green-600 text-black text-xs font-extrabold px-4 py-2 rounded-lg transition-colors shadow-sm"
                      >
                        Save Group
                      </button>
                    </div>
                  </div>

                  {/* SPECIFICATION MATRIX CHANNELS */}
                  {isExpanded && (
                    <div className="p-3 md:p-6 bg-[#f4f7f5]">
                      {/* Desktop Column Matrix */}
                      <div className="hidden lg:block overflow-x-auto border border-[#cbd5e1] rounded-xl bg-green-600 shadow-inner">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="bg-[#1e2e2a] text-[#e2efe9] font-bold uppercase tracking-wider text-[11px] border-b border-[#14532d]">
                              <th className="p-4 pl-5 font-extrabold">
                                SKU Layout Matrix
                              </th>
                              <th className="p-4 text-center bg-[#283e39] font-extrabold w-[180px]">
                                🏭 Main Warehouse
                              </th>
                              {showrooms.map((s) => (
                                <th
                                  key={`header-showroom-${s.showroom}`}
                                  className="p-4 font-extrabold bg-[#223530] text-center border-l border-[#2d423e]"
                                >
                                  🏢 {s.showroom}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e2e8f0] text-[#334155]">
                            {variants.map((vItem) => (
                              <tr
                                key={`row-variant-${vItem._id}`}
                                className="hover:bg-[#f8faf9] transition-colors"
                              >
                                <td className="p-4 pl-5">
                                  <div className="flex items-center gap-3">
                                    {vItem.variantId?.media?.[0]
                                      ?.secure_url && (
                                      <div className="w-8 h-8 relative flex-shrink-0 border border-[#e2e8f0] rounded bg-white overflow-hidden">
                                        <Image
                                          src={
                                            vItem.variantId.media[0].secure_url
                                          }
                                          alt=""
                                          fill
                                          className="object-contain"
                                        />
                                      </div>
                                    )}
                                    <span className="font-extrabold text-[#0f172a] text-sm">
                                      {vItem.variantId?.color || "Standard"}{" "}
                                      &bull; {vItem.variantId?.size || "UNI"}
                                    </span>
                                  </div>
                                </td>

                                {/* Colored Column: Main Warehouse */}
                                <td className="p-4 text-center bg-green-600 font-semibold border-x border-[#d1fac7]/40">
                                  <span
                                    className={`inline-block px-2.5 py-1 rounded-md font-extrabold text-[11px] ${vItem.stock > 0 ? "bg-[#d1fae5] text-[#065f46]" : "bg-[#fee2e2] text-[#991b1b]"}`}
                                  >
                                    {vItem.stock} items
                                  </span>
                                </td>

                                {/* Colored Columns: Dynamic Showrooms */}
                                {showrooms.map((showroom) => {
                                  const cellKey = `${vItem._id}_${showroom.showroom}`;
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
                                      key={`cell-show-${vItem._id}-${showroom.showroom}`}
                                      className="p-4 bg-[#fbfdfb] border-l border-[#e2e8f0] text-center"
                                    >
                                      <div className="flex items-center justify-center gap-4">
                                        <span className="text-[#475569] text-[12px] font-medium">
                                          Current:{" "}
                                          <b className="text-[#0f172a] font-bold">
                                            {currentStock}
                                          </b>
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          value={pendingValue}
                                          onChange={(e) =>
                                            handleQtyChange(
                                              vItem._id,
                                              showroom.showroom,
                                              e.target.value,
                                            )
                                          }
                                          className={`border rounded-lg px-2.5 py-1 text-right w-20 focus:outline-none focus:ring-2 focus:ring-[#10b981]/30 text-xs font-bold transition-all ${
                                            pendingValue !== ""
                                              ? "border-[#10b981] bg-[#d1fae5] text-[#065f46] shadow-sm"
                                              : "border-[#cbd5e1] bg-white text-[#0f172a]"
                                          }`}
                                        />
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View Card Grid */}
                      <div className="lg:hidden space-y-3">
                        {variants.map((vItem) => (
                          <div
                            key={`mob-variant-${vItem._id}`}
                            className="bg-white p-4 rounded-xl border border-[#cbd5e1] shadow-sm space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-[#e2e8f0] pb-2.5">
                              <div className="flex items-center gap-2.5">
                                <span className="font-extrabold text-[#0f172a] text-sm">
                                  {vItem.variantId?.color || "Standard"} /{" "}
                                  {vItem.variantId?.size || "UNI"}
                                </span>
                              </div>
                              <span className="text-[12px] px-2.5 py-0.5 rounded-md bg-[#d1fae5] text-[#065f46] font-extrabold">
                                WH: {vItem.stock}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {showrooms.map((showroom) => {
                                const cellKey = `${vItem._id}_${showroom.showroom}`;
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
                                    key={`mob-cell-${vItem._id}-${showroom.showroom}`}
                                    className="flex items-center justify-between p-3 rounded-lg bg-[#f0f4f2] border border-[#d1dad6]"
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-[12px] font-bold text-[#14532d]">
                                        🏢 {showroom.showroom}
                                      </span>
                                      <span className="text-[11px] text-[#475569] font-medium">
                                        In Store: {currentStock}
                                      </span>
                                    </div>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={pendingValue}
                                      onChange={(e) =>
                                        handleQtyChange(
                                          vItem._id,
                                          showroom.showroom,
                                          e.target.value,
                                        )
                                      }
                                      className={`border rounded-lg px-2.5 py-1 text-right w-20 text-xs font-bold transition-all ${
                                        pendingValue !== ""
                                          ? "border-[#10b981] bg-[#d1fae5] text-[#065f46]"
                                          : "border-[#cbd5e1] bg-white"
                                      }`}
                                    />
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

            {stock.length === 0 && (
              <div className="bg-white rounded-xl border border-[#cbd5e1] p-20 text-center text-[#64748b] font-semibold italic">
                No active records configured in ledger.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
