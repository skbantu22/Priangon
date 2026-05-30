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

  // LOAD DATA FROM SYSTEM APIs & GROUP BY PRODUCT
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
      console.log("STOCK OVERVIEW:", overview);

      const warehouseData = overview.find((x) => x.showroom === "Warehouse");

      const showroomData = overview.filter((x) => x.showroom !== "Warehouse");

      setShowrooms(showroomData);

      // Auto-expand all product rows by default for visibility
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

  // TOGGLE PRODUCT VARIANT ACCORDION
  const toggleProduct = (productId) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // TRACK INLINE QUANTITY CHANGES FOR SPECIFIC VARIANT SKU
  const handleQtyChange = (variantStockId, showroomId, value) => {
    setEditedStock((prev) => ({
      ...prev,
      [`${variantStockId}_${showroomId}`]: value,
    }));
  };

  // PERSIST ENTIRE PRODUCT FAMILY VARIANT ADJUSTMENTS
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
          showrooms.forEach((s) => delete copy[`${item._id}_${s._id}`]);
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

  // BATCH COMMIT ALL PENDING VARIANT MODIFICATIONS SYSTEM-WIDE
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
      alert("All SKU balances successfully matched system-wide.");
      loadDashboardData();
    } catch (err) {
      console.error(err);
      alert("Global ledger batch update failed.");
    } finally {
      setIsSaving(false);
    }
  };

  // Structural helper to group flat items by Parent Product unique ID
  const groupedStock = stock.reduce((acc, current) => {
    const pId = current.productId?._id;
    if (!pId) return acc;
    if (!acc[pId]) {
      acc[pId] = {
        product: current.productId,
        variants: [],
      };
    }
    acc[pId].variants.push(current);
    return acc;
  }, {});

  return (
    <div className="w-full p-4 bg-gray-50 min-h-screen text-gray-700">
      <div className="max-w-[1700px] mx-auto bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
        {/* Top Header Controls Bar */}
        <div className="p-3 bg-gray-50/50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <span className="text-sm font-bold text-gray-800 block">
              All Stock Overview
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={loadDashboardData}
              className="bg-white border border-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded-sm shadow-sm hover:bg-gray-50 transition"
            >
              Refresh Master Ledger
            </button>
            <button
              onClick={handleSaveAll}
              disabled={Object.keys(editedStock).length === 0 || isSaving}
              className={`text-xs px-3 py-1.5 rounded-sm shadow-sm transition text-black font-medium ${
                Object.keys(editedStock).length === 0
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-[#2ca359] hover:bg-[#238347]"
              }`}
            >
              {isSaving ? "Updating System..." : "Commit All Changes"}
            </button>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="p-16 text-center text-xs text-gray-400 animate-pulse">
            Re-indexing relational master stock variants...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-green-600 text-white text-[18px] font-semibold select-none">
                  {/* Accordion Trigger Header */}
                  <th className="p-2 border-r border-[#248a4a] w-12 text-center">
                    ⇄
                  </th>

                  {/* Product Header */}
                  <th className="p-2 border-r border-[#248a4a] min-w-[280px]">
                    <div className="flex items-center justify-between px-1">
                      <span>Inventory Item Lineage</span>
                      <span className="text-[10px] opacity-70">▲▼</span>
                    </div>
                  </th>

                  {/* Warehouse Depot Header */}
                  <th className="p-2 border-r border-[#248a4a] w-40">
                    <div className="flex items-center justify-between px-1">
                      <span>🏭 Warehouse Stock</span>
                      <span className="text-[10px] opacity-70">▲▼</span>
                    </div>
                  </th>

                  {/* Dynamic Showrooms Mapping */}
                  {showrooms.map((s) => (
                    <th
                      key={s.showroom}
                      className="p-2 border-r border-[#248a4a] min-w-[180px]"
                    >
                      <div className="flex items-center justify-between px-1">
                        <span>🏢 {s.showroom}</span>
                        <span className="text-[10px] opacity-70">⇄</span>
                      </div>
                    </th>
                  ))}

                  {/* Operations Actions Header */}
                  <th className="p-2 w-32 text-center">Operations</th>
                </tr>
              </thead>

              <tbody className="text-[13px] text-gray-950 font-medium">
                {Object.values(groupedStock).map(({ product, variants }) => {
                  const isExpanded = !!expandedProducts[product._id];
                  const totalWarehouseStock = variants.reduce(
                    (acc, curr) => acc + curr.stock,
                    0,
                  );

                  return (
                    <React.Fragment key={product._id}>
                      {/* PARENT PRODUCT ROW */}
                      <tr
                        onClick={() => toggleProduct(product._id)}
                        className="bg-gray-50/60 hover:bg-gray-50 border-b border-gray-200 transition-colors cursor-pointer"
                      >
                        {/* Toggle Arrow */}
                        <td className="p-2 text-center text-gray-400 font-bold">
                          {isExpanded ? "▼" : "▶"}
                        </td>

                        {/* Parent Product Specs */}
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {product.media?.[0]?.secure_url && (
                              <div className="w-16 h-20 relative flex-shrink-0 border border-gray-200 rounded-sm bg-white">
                                <Image
                                  src={product.media[0].secure_url}
                                  alt=""
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-[#2563eb] hover:underline font-bold text-xl">
                                {product.name}
                              </span>
                              <span className="text-[15px] px-1.5 py-0.5 bg-gray-200/70 text-gray-500 rounded-sm font-mono">
                                {variants.length} variants
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Total Warehouse Stock */}
                        <td className="p-2 text-gray-950 font-bold bg-gray-50/30 text-center">
                          Total: {totalWarehouseStock} Pcs
                        </td>

                        {/* Informational Span for Parent Grid */}
                        <td
                          colSpan={showrooms.length}
                          className="p-2 text-xs text-gray-400 italic tracking-wide"
                        >
                          Click row to view or edit specific variations balances
                          below
                        </td>

                        {/* Sync Whole Family Action */}
                        <td
                          className="p-2 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleSyncProductFamily(product._id)}
                            className="bg-[#35b5ec] hover:bg-[#20a4db] text-gray-950 text-[12px] font-semibold px-2.5 py-1 rounded-sm shadow-sm transition"
                          >
                            Save Changes
                          </button>
                        </td>
                      </tr>

                      {/* SUB-VARIANT SKUS CHILD ROWS */}
                      {isExpanded &&
                        variants.map((vItem) => (
                          <tr
                            key={vItem._id}
                            className="border-b border-gray-100 hover:bg-gray-50/40 transition-colors"
                          >
                            <td></td>

                            {/* Variant Specs Info */}
                            <td className="p-2 pl-8 border-r border-gray-100">
                              <div className="flex items-center gap-2">
                                {vItem.variantId?.media?.[0]?.secure_url && (
                                  <div className="w-6 h-6 relative flex-shrink-0 border border-gray-100 rounded-sm bg-white">
                                    <Image
                                      src={vItem.variantId.media[0].secure_url}
                                      alt=""
                                      fill
                                      className="object-contain"
                                    />
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-gray-400 font-mono tracking-tight">
                                    SKU CONFIG
                                  </span>
                                  <span className="font-semibold text-gray-700">
                                    {vItem.variantId?.color || "Default"} /{" "}
                                    {vItem.variantId?.size || "Free Size"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Specific Variant Warehouse Depot Stock */}
                            <td className="p-2 border-r border-gray-100 text-center text-gray-600">
                              <span
                                className={`px-2 py-0.5 rounded-sm text-xs font-semibold ${vItem.stock > 0 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-600"}`}
                              >
                                {vItem.stock} Available
                              </span>
                            </td>

                            {/* Showrooms Input Grid Matrix */}
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
                                  key={showroom.showroom}
                                  className="p-2 border-r border-gray-100 align-middle"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                      Stock:{" "}
                                      <b className="text-gray-600 font-bold">
                                        {currentStock}
                                      </b>
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="Add..."
                                      value={pendingValue}
                                      onChange={(e) =>
                                        handleQtyChange(
                                          vItem._id,
                                          showroom._id,
                                          e.target.value,
                                        )
                                      }
                                      className={`border rounded-sm px-1.5 py-0.5 text-xs text-right w-16 focus:outline-none font-mono transition-all ${
                                        pendingValue !== ""
                                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold"
                                          : "border-gray-200 bg-white text-gray-700 focus:border-sky-400"
                                      }`}
                                    />
                                  </div>
                                </td>
                              );
                            })}

                            {/* Operations Fallback column */}
                            <td className="p-2 text-center text-xs text-gray-400 italic">
                              via Parent
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}

                {stock.length === 0 && (
                  <tr>
                    <td
                      colSpan={4 + showrooms.length}
                      className="p-16 text-center text-gray-400 italic bg-white"
                    >
                      No product lineages register inside current active data
                      layers.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
