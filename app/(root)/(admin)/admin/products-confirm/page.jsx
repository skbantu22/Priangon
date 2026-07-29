"use client";

import React, { useState } from "react";
import axios from "axios";
import Image from "next/image";
import { toast } from "sonner";
import { Search, RefreshCw, Layers } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function AdvancedInventoryDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedProducts, setExpandedProducts] = useState({});
  const [editedStock, setEditedStock] = useState({});
  const queryClient = useQueryClient();
  const normalize = (text = "") => text.toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. React Query for Zero Loading Experience & Smart Caching
  const {
    data: dashboardData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["advancedInventoryMatrix"],
    queryFn: async () => {
      const [warehouseRes, overviewRes, showroomRes] = await Promise.all([
        axios.get("/api/warehouse-stock"),
        axios.get("/api/stock/stock-overview"),
        axios.get("/api/showrooms"),
      ]);

      const rawStock = warehouseRes.data.data || [];
      const rawShowrooms =
        showroomRes.data.showrooms || showroomRes.data.data || [];
      const overviewData = overviewRes.data.data || [];

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

      // Default expand all product families on initial fetch
      const initialExpanded = {};
      rawStock.forEach((item) => {
        if (item.productId?._id) {
          initialExpanded[item.productId._id] = true;
        }
      });

      return { stock: rawStock, showrooms: mergedShowrooms, initialExpanded };
    },
    staleTime: 1000 * 60 * 5, // ৫ মিনিট পর্যন্ত ক্যাশ থাকবে (Zero Loading on revisit)
  });

  const stock = dashboardData?.stock || [];
  const showrooms = dashboardData?.showrooms || [];

  // Initialize expanded state if not already set
  const isExpanded = (productId) => {
    if (expandedProducts[productId] !== undefined) {
      return expandedProducts[productId];
    }
    return true; // Default expanded
  };

  const toggleProduct = (productId) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [productId]: prev[productId] !== undefined ? !prev[productId] : false,
    }));
  };

  const handleQtyChange = (variantStockId, showroomId, value) => {
    setEditedStock((prev) => ({
      ...prev,
      [`${variantStockId}_${showroomId}`]: value,
    }));
  };

  // 2. Mutation for Single Product Family Sync
  const allocateMutation = useMutation({
    mutationFn: async (payloads) => {
      return await Promise.all(
        payloads.map((p) => axios.post("/api/stock/allocate-to-showroom", p)),
      );
    },
    onSuccess: () => {
      toast.success("Successfully dispatched stock allocations!");
      queryClient.invalidateQueries({ queryKey: ["advancedInventoryMatrix"] });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Stock synchronization failed.");
    },
  });

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

    allocateMutation.mutate(payloads, {
      onSuccess: () => {
        setEditedStock((prev) => {
          const copy = { ...prev };
          familyVariants.forEach((item) => {
            showrooms.forEach((s) => delete copy[`${item._id}_${s._id}`]);
          });
          return copy;
        });
      },
    });
  };

  // 3. Mutation for Stock Return
  const returnMutation = useMutation({
    mutationFn: async (payload) => {
      return await axios.post("/api/stock/return-to-warehouse", payload);
    },
    onSuccess: () => {
      toast.success("Stock Returned Successfully");
      queryClient.invalidateQueries({ queryKey: ["advancedInventoryMatrix"] });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Return Failed");
    },
  });

  const handleReturnStock = async (showroom, product, variant) => {
    const qty = prompt(
      `Enter Return Quantity for ${showroom.name || "Showroom"}:`,
    );
    if (!qty || Number(qty) <= 0) return;

    returnMutation.mutate({
      showroomId: showroom._id,
      productId: product._id,
      variantId: variant.variantId?._id,
      qty: Number(qty),
    });
  };

  // 4. Mutation for Global Batch Update
  const globalSaveMutation = useMutation({
    mutationFn: async (requests) => {
      return await Promise.all(requests);
    },
    onSuccess: () => {
      setEditedStock({});
      toast.success("All SKU balances successfully matched system-wide.");
      queryClient.invalidateQueries({ queryKey: ["advancedInventoryMatrix"] });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Global ledger batch update failed.");
    },
  });

  const handleSaveAll = async () => {
    const keys = Object.keys(editedStock).filter((k) => editedStock[k] !== "");
    if (keys.length === 0) {
      toast.error("No pending stock modifications found.");
      return;
    }

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

    globalSaveMutation.mutate(requests);
  };

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

  const filteredProducts = Object.values(groupedStock)
    .map(({ product, variants }) => {
      if (!searchTerm) {
        return { product, variants };
      }

      const keyword = normalize(searchTerm);

      if (normalize(product?.name).includes(keyword)) {
        return { product, variants };
      }

      const matchedVariants = variants.filter((v) => {
        return (
          normalize(v.variantId?.barcode).includes(keyword) ||
          normalize(v.variantId?.sku).includes(keyword) ||
          normalize(v.variantId?.color).includes(keyword) ||
          normalize(v.variantId?.size).includes(keyword)
        );
      });

      return {
        product,
        variants: matchedVariants,
      };
    })
    .filter(({ variants }) => variants.length > 0);

  const hasPendingChanges = Object.keys(editedStock).some(
    (k) => editedStock[k] !== "",
  );

  return (
    <div className="w-full min-h-screen bg-[#f0f4f2] text-[#1e293b] font-sans antialiased p-4 md:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1e2e2a] text-[#f8fafc] p-6 rounded-none border border-[#2d423e] shadow-md">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="text-emerald-400" size={22} />
              <h1 className="text-xl font-black tracking-tight">
                Advanced Inventory Matrix
              </h1>
              {isFetching && !isLoading && (
                <span className="text-[10px] bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded-none animate-pulse">
                  Syncing background...
                </span>
              )}
            </div>
            <p className="text-xs text-[#a3b899] font-medium mt-1">
              Live multi-showroom stock dispatch & zero-latency cache sync
            </p>
          </div>

          <div className="relative w-full sm:w-96">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search Product / SKU / Color / Size..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-none bg-white text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
            />
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <button
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: ["advancedInventoryMatrix"],
                })
              }
              className="flex items-center gap-2 text-[#f8fafc] border border-[#3e5954] text-xs font-bold px-4 py-2 rounded-none hover:bg-[#39534e] transition-all"
            >
              <RefreshCw
                size={14}
                className={isFetching ? "animate-spin" : ""}
              />
              Refresh Data
            </button>
            <button
              onClick={handleSaveAll}
              disabled={!hasPendingChanges || globalSaveMutation.isPending}
              className={`text-xs font-extrabold px-5 py-2 rounded-none transition-all text-white shadow-sm border ${
                !hasPendingChanges
                  ? "bg-gray-600 border-gray-500 cursor-not-allowed opacity-50"
                  : "bg-emerald-600 hover:bg-emerald-700 border-emerald-500"
              }`}
            >
              {globalSaveMutation.isPending
                ? "Saving..."
                : "Commit Global Matrix"}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-none border border-[#cbd5e1] p-24 text-center shadow-sm">
            <div className="inline-block w-8 h-8 border-4 border-[#14532d] border-t-transparent rounded-none animate-spin mb-4"></div>
            <p className="text-sm font-bold text-[#334155]">
              Loading Matrix Cache...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map(({ product, variants }) => {
              const expanded = isExpanded(product._id);
              const totalWarehouseStock = variants.reduce(
                (acc, curr) => acc + curr.stock,
                0,
              );

              return (
                <div
                  key={`product-card-${product._id}`}
                  className="bg-white border border-[#cbd5e1] rounded-none shadow-sm overflow-hidden"
                >
                  {/* Accordion Trigger Header */}
                  <div
                    onClick={() => toggleProduct(product._id)}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-[#e2e8f0]"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-[#64748b] text-sm font-bold transition-transform duration-200 ${expanded ? "rotate-90 text-emerald-700" : ""}`}
                      >
                        ➔
                      </span>
                      {product.media?.[0]?.secure_url && (
                        <div className="w-12 h-16 relative flex-shrink-0 border border-[#cbd5e1] rounded-none bg-gray-100 overflow-hidden">
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
                          <span className="text-[11px] px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-none font-bold border border-emerald-200">
                            {variants.length} Variants
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4">
                      <div className="bg-gray-100 px-4 py-1.5 rounded-none border border-gray-200 text-center">
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
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-none transition-all shadow-sm border border-emerald-500"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  {/* Nested Inventory Matrix */}
                  {expanded && (
                    <div className="p-4 bg-[#f8faf9]">
                      {/* Desktop Grid Layout */}
                      <div className="hidden lg:block overflow-x-auto border border-gray-200 rounded-none bg-white shadow-sm">
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
                                      <div className="w-8 h-10 relative border rounded-none bg-white overflow-hidden">
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

                                <td className="p-4 text-center border-r border-gray-100 bg-emerald-50/40">
                                  <span className="inline-block px-3 py-1 rounded-none font-bold text-xs bg-emerald-100 text-emerald-800 border border-emerald-200">
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
                                          className={`w-14 border rounded-none px-1.5 py-1 text-center font-bold text-xs transition-all outline-none ${
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
                                          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2 py-1 rounded-none font-bold text-[11px] transition-all"
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
                            className="bg-white p-4 rounded-none border border-gray-200 shadow-sm space-y-3"
                          >
                            <div className="flex items-center justify-between border-b pb-2">
                              <span className="font-extrabold text-sm text-gray-900">
                                {vItem.variantId?.color || "Standard"} /{" "}
                                {vItem.variantId?.size || "UNI"}
                              </span>
                              <span className="text-xs px-2.5 py-0.5 rounded-none bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
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
                                    className="flex items-center justify-between p-3 rounded-none bg-gray-50 border border-gray-200"
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
                                        className={`border rounded-none px-2 py-1 text-center w-14 text-xs font-bold outline-none ${
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
                                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2 py-1 rounded-none text-[11px] font-bold"
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
