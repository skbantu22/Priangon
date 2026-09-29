"use client";

import { useEffect, useState } from "react";
import { ChevronRight, X } from "lucide-react";

const money = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;
const amount = (n) =>
  Number(n || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function ExchangeModal({
  isOpen,
  onClose,
  showroomId,
  onOpenCheckout,
  currentPosCart = [],
}) {
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [originalOrder, setOriginalOrder] = useState(null);

  // Core Arrays
  const [returnedItems, setReturnedItems] = useState([]);
  const [newItems, setNewItems] = useState([]);

  const [reason, setReason] = useState("");

  // Product Search
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);

  // Toast Notification State
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3000);
  };

  // Sync current POS cart items to exchange tray
  useEffect(() => {
    if (isOpen) {
      if (currentPosCart && currentPosCart.length > 0) {
        const preLoadedItems = currentPosCart.map((item) => {
          const nestedProduct = item?.productId || {};
          const nestedVariant = item?.variantId || {};

          const targetProductId =
            nestedProduct._id || item?.productId || item?._id;
          const targetVariantId =
            nestedVariant._id || item?.variantId || item?._id;

          const availableStock = parseInt(
            nestedVariant.showroomStock ||
              nestedVariant.stock ||
              item?.maxStock ||
              item?.stock ||
              99,
          );

          const parsedPrice = parseFloat(
            nestedVariant.sellingPrice ||
              nestedVariant.price ||
              item?.price ||
              0,
          );

          const itemQty = parseInt(item.qty || 1);

          return {
            productId: targetProductId,
            variantId: targetVariantId,
            name: nestedProduct.name || item?.name || "Catalog Product",
            image:
              nestedVariant?.media?.[0]?.secure_url ||
              nestedVariant?.media?.[0]?.url ||
              nestedProduct?.media?.[0]?.secure_url ||
              nestedProduct?.media?.[0]?.url ||
              item.image ||
              "",
            color: nestedVariant.color || item?.color || "N/A",
            size: nestedVariant.size || item?.size || "Standard",
            price: parsedPrice,
            qty: itemQty,
            maxStock: availableStock,
            subtotal: itemQty * parsedPrice,
          };
        });

        setNewItems(preLoadedItems);
      }
    }
  }, [isOpen]);

  // Reset modal on close
  useEffect(() => {
    if (!isOpen) {
      setOrderNumber("");
      setOriginalOrder(null);
      setReturnedItems([]);
      setNewItems([]);
      setReason("");
      setSearch("");
      setProducts([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ==========================================
  // SEARCH INVOICE (Trimmed spaces & Toast added)
  // ==========================================
  const searchOrder = async (invoiceQuery) => {
    const cleanOrderNumber = String(invoiceQuery ?? orderNumber).trim();
    if (!cleanOrderNumber) {
      showToast("Please enter a valid invoice number!", "error");
      return false;
    }

    setLoading(true);
    try {
      const shopQuery =
        showroomId && /^[a-f\d]{24}$/i.test(String(showroomId))
          ? `&showroomId=${encodeURIComponent(showroomId)}`
          : "";
      const res = await fetch(
        `/api/showroom-orders?orderNumber=${encodeURIComponent(cleanOrderNumber)}${shopQuery}`,
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Server HTML Error Response:", errorText);
        showToast(`Failed to load invoice (${res.status})`, "error");
        return false;
      }

      const data = await res.json();

      if (data?.success === false) {
        showToast(data.message || "Invoice not found!", "error");
        setOriginalOrder(null);
        return false;
      }

      if (data?.order) {
        setOriginalOrder(data.order);
        setOrderNumber(cleanOrderNumber);
        setReturnedItems([]);
        showToast("Invoice loaded successfully!");
        return true;
      }

      showToast("Invoice not found!", "error");
      setOriginalOrder(null);
      return false;
    } catch (err) {
      console.error("Order Search Error:", err);
      showToast(
        "An unexpected error occurred while looking up invoice.",
        "error",
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // SEARCH PRODUCTS
  // ==========================================
  const searchProducts = async (query) => {
    const term = String(query ?? search).trim();
    if (!term) return;

    try {
      const res = await fetch(
        `/api/pos/stock-search?showroomId=${showroomId}&q=${encodeURIComponent(term)}`,
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Stock API Error:", errorText);
        setProducts([]);
        return;
      }

      const data = await res.json();
      const result = data.items || data.data || data || [];
      setProducts(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("Search error:", err);
      setProducts([]);
    }
  };

  const matchInvoiceLine = (item, term) => {
    const q = term.toLowerCase();
    const name = String(item.name || item.productName || "").toLowerCase();
    const sku = String(item.sku || item.barcode || "").toLowerCase();
    return name.includes(q) || sku.includes(q) || sku === q;
  };

  const handleUnifiedSearch = async () => {
    const term = search.trim();
    if (!term) {
      showToast("Enter invoice, product name, SKU, or barcode", "error");
      return;
    }

    if (originalOrder) {
      const line = (originalOrder.items || []).find((item) =>
        matchInvoiceLine(item, term),
      );
      if (line) {
        toggleReturnItem(line);
        setSearch("");
        setProducts([]);
        return;
      }
    } else {
      const loaded = await searchOrder(term);
      if (loaded) {
        setSearch("");
        setProducts([]);
        return;
      }
    }

    await searchProducts(term);
  };

  const clearExchange = () => {
    setOriginalOrder(null);
    setReturnedItems([]);
    setNewItems([]);
    setOrderNumber("");
    setSearch("");
    setProducts([]);
    setReason("");
  };

  // ==========================================
  // TOGGLE RETURNED ITEMS
  // ==========================================
  const toggleReturnItem = (item) => {
    const itemUniqueId = item.variantId?._id || item.variantId || item._id;
    const exists = returnedItems.find((i) => i.variantId === itemUniqueId);

    if (exists) {
      setReturnedItems(
        returnedItems.filter((i) => i.variantId !== itemUniqueId),
      );
    } else {
      const cleanReturnItem = {
        productId: item.productId?._id || item.productId,
        variantId: itemUniqueId,
        name: item.name || item.productName || "Unknown Item",
        image: item.image || "",
        color: item.color || "",
        size: item.size || "",
        price: parseFloat(item.price || item.sellingPrice || 0),
        qty: parseInt(item.qty || 1),
        maxQty: parseInt(item.qty || 1),
        subtotal: parseFloat(item.subtotal || item.price * item.qty || 0),
      };
      setReturnedItems([...returnedItems, cleanReturnItem]);
    }
  };

  const updateReturnQty = (variantId, newQty) => {
    const val = parseInt(newQty) || 1;
    setReturnedItems((prev) =>
      prev.map((item) => {
        if (item.variantId === variantId) {
          if (val > item.maxQty) {
            showToast(
              `Cannot return more than purchased qty (${item.maxQty})`,
              "error",
            );
            return item;
          }
          return { ...item, qty: val, subtotal: val * item.price };
        }
        return item;
      }),
    );
  };

  // ==========================================
  // FIXED NEW CART SYSTEM
  // ==========================================
  const addToCart = (stockItem) => {
    const nestedProduct = stockItem?.productId || {};
    const nestedVariant = stockItem?.variantId || {};

    const targetProductId =
      nestedProduct._id || stockItem?.productId || stockItem?._id;
    const targetVariantId =
      nestedVariant._id || stockItem?.variantId || stockItem?._id;

    const availableStock = parseInt(
      nestedVariant.showroomStock ||
        nestedVariant.stock ||
        stockItem?.stock ||
        99,
    );

    if (!targetVariantId) {
      showToast("Cannot add item: Variant identifier missing.", "error");
      return;
    }

    if (availableStock <= 0) {
      showToast("This item is completely out of stock!", "error");
      return;
    }

    const existsIndex = newItems.findIndex(
      (item) => item.variantId === targetVariantId,
    );

    if (existsIndex > -1) {
      const updated = [...newItems];
      if (updated[existsIndex].qty + 1 > availableStock) {
        showToast(`Only ${availableStock} pcs available in stock.`, "error");
        return;
      }
      updated[existsIndex].qty += 1;
      updated[existsIndex].subtotal =
        updated[existsIndex].qty * updated[existsIndex].price;
      setNewItems(updated);
    } else {
      const nameString =
        nestedProduct.name || stockItem?.name || "Catalog Product";
      const parsedPrice = parseFloat(
        nestedVariant.sellingPrice ||
          nestedVariant.price ||
          stockItem?.price ||
          0,
      );

      setNewItems([
        ...newItems,
        {
          productId: targetProductId,
          variantId: targetVariantId,
          name: nameString,
          image:
            nestedVariant?.media?.[0]?.secure_url ||
            nestedVariant?.media?.[0]?.url ||
            "",
          color: nestedVariant.color || "",
          size: nestedVariant.size || "",
          price: parsedPrice,
          qty: 1,
          maxStock: availableStock,
          subtotal: parsedPrice,
        },
      ]);
    }
  };

  const updateCartQty = (index, newQty) => {
    const val = parseInt(newQty) || 1;
    if (val < 1) return;

    const updated = [...newItems];
    if (val > updated[index].maxStock) {
      showToast(
        `Only ${updated[index].maxStock} pcs available in stock`,
        "error",
      );
      return;
    }
    updated[index].qty = val;
    updated[index].subtotal = val * updated[index].price;
    setNewItems(updated);
  };

  const removeCartItem = (index) => {
    setNewItems(newItems.filter((_, i) => i !== index));
  };

  // Calculations
  const returnedTotal = returnedItems.reduce((sum, i) => sum + i.subtotal, 0);
  const newTotal = newItems.reduce((sum, i) => sum + i.subtotal, 0);
  const difference = newTotal - returnedTotal;

  const handleProceedToExchangeCheckout = () => {
    if (returnedItems.length === 0) {
      showToast("Please select at least one item to return!", "error");
      return;
    }
    if (newItems.length === 0) {
      showToast("Please add at least one new item to cart!", "error");
      return;
    }

    const payable = difference > 0 ? difference : 0;
    const refundAmount = difference < 0 ? Math.abs(difference) : 0;

    onOpenCheckout({
      isExchangeMode: true,
      total: payable > 0 ? payable : 0,
      exchangeSummary: {
        returnedTotal,
        newTotal,
        difference,
        refundAmount,
        extraPaid: payable,
      },
      exchangeData: {
        originalOrderId: originalOrder._id,
        reason: reason.trim() || "Size/Color Exchange",
        returnedItems: returnedItems.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          productName: i.name,
          image: i.image || "",
          color: i.color,
          size: i.size,
          qty: i.qty,
          price: i.price,
          subtotal: i.subtotal,
        })),
        newItems: newItems.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          productName: i.name,
          image: i.image || "",
          color: i.color,
          size: i.size,
          qty: i.qty,
          price: i.price,
          subtotal: i.subtotal,
        })),
      },
      cart: newItems,
    });

    onClose();
  };

  const exchangeProductQty = returnedItems.reduce(
    (sum, i) => sum + (Number(i.qty) || 0),
    0,
  );
  const invoiceLabel =
    originalOrder?.orderNumber || orderNumber.trim() || "—";

  const summaryRows = [
    ["Exchange Product", exchangeProductQty],
    ["Exchange Total", amount(returnedTotal)],
    ["Cart Total", amount(newTotal)],
    ["Difference", amount(difference)],
    ["Invoice No", invoiceLabel],
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Exchange Details"
    >
      {toast.show && (
        <div
          className={`fixed left-3 right-3 top-3 z-[10001] rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg sm:left-auto sm:right-4 sm:top-4 sm:max-w-sm ${
            toast.type === "error" ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-lg">
        <div className="flex shrink-0 flex-col gap-2 border-b border-gray-200 px-3 py-2.5 sm:flex-row sm:items-center sm:px-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900 sm:text-lg">
              Exchange Details
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto flex size-10 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 sm:hidden"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnifiedSearch()}
              className="h-10 w-full min-w-0 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-blue-600 sm:h-11 sm:text-base"
              placeholder="Enter Invoice No Product name / SKU / Scan bar code"
            />
            <button
              type="button"
              onClick={handleUnifiedSearch}
              disabled={loading}
              className="hidden h-10 shrink-0 rounded-md bg-blue-800 px-3 text-xs font-bold text-white sm:inline-flex sm:h-11"
            >
              {loading ? "…" : "Search"}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hidden size-10 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 sm:flex"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {products.length > 0 && (
          <ul className="max-h-32 shrink-0 overflow-y-auto border-b border-gray-100 bg-slate-50 px-3 py-2">
            {products.map((stockItem, i) => {
              const coreProduct = stockItem.productId || {};
              const variantData = stockItem.variantId || {};
              const currentStock =
                variantData.showroomStock ||
                variantData.stock ||
                stockItem.stock ||
                0;
              const price =
                variantData.sellingPrice || variantData.price || 0;

              return (
                <li
                  key={i}
                  className="flex items-center gap-2 border-b border-gray-100 py-2 last:border-0"
                >
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-semibold">
                      {coreProduct.name || "Product"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Stock {currentStock} · {money(price)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={Number(currentStock) <= 0}
                    onClick={() => {
                      addToCart(stockItem);
                      setProducts([]);
                      setSearch("");
                    }}
                    className="shrink-0 rounded-md bg-blue-700 px-3 py-1.5 text-xs font-bold text-white disabled:bg-gray-300"
                  >
                    Add
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <aside className="shrink-0 border-b border-gray-200 bg-slate-50 lg:w-56 lg:border-b-0 lg:border-r xl:w-64">
            <table className="w-full text-sm">
              <tbody>
                {summaryRows.map(([label, value]) => (
                  <tr key={label} className="border-b border-gray-200/80">
                    <td className="bg-sky-50/80 px-3 py-2.5 font-semibold text-gray-800">
                      {label}
                    </td>
                    <td className="bg-white px-3 py-2.5 text-right font-bold text-gray-900">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {originalOrder && (
              <p className="px-3 py-2 text-xs text-gray-500">
                This shop only · return stock comes back · new items must be in
                stock here
              </p>
            )}
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
              <table className="w-full min-w-0 text-sm">
                <thead className="sticky top-0 z-[1] bg-blue-800 text-white">
                  <tr>
                    <th className="px-2 py-2.5 text-left font-semibold sm:px-3">
                      Product Name
                    </th>
                    <th className="w-14 px-1 py-2.5 text-center font-semibold sm:w-16">
                      Qty
                    </th>
                    <th className="w-16 px-1 py-2.5 text-right font-semibold sm:w-20">
                      Price
                    </th>
                    <th className="w-16 px-1 py-2.5 text-right font-semibold sm:w-20">
                      Total
                    </th>
                    <th className="w-14 px-1 py-2.5 text-center font-semibold sm:w-16">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {returnedItems.length === 0 && newItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-10 text-center text-gray-400"
                      >
                        Load invoice, pick return items, then add new products
                        from search
                      </td>
                    </tr>
                  ) : (
                    <>
                      {returnedItems.map((item, i) => (
                        <tr
                          key={`ret-${item.variantId}-${i}`}
                          className="border-b border-gray-100 bg-red-50/40"
                        >
                          <td className="px-2 py-2 sm:px-3">
                            <span className="font-medium text-gray-900">
                              {item.name}
                            </span>
                            <span className="ml-1 text-[10px] font-bold uppercase text-red-600">
                              Return
                            </span>
                          </td>
                          <td className="px-1 py-2 text-center">
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) =>
                                updateReturnQty(item.variantId, e.target.value)
                              }
                              max={item.maxQty}
                              min="1"
                              className="mx-auto h-8 w-12 rounded border bg-white text-center text-xs font-bold"
                            />
                          </td>
                          <td className="px-1 py-2 text-right text-xs sm:text-sm">
                            {amount(item.price)}
                          </td>
                          <td className="px-1 py-2 text-right text-xs font-bold sm:text-sm">
                            {amount(item.subtotal)}
                          </td>
                          <td className="px-1 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggleReturnItem({ variantId: item.variantId, ...item })}
                              className="text-xs font-bold text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                      {newItems.map((item, i) => (
                        <tr
                          key={`new-${item.variantId}-${i}`}
                          className="border-b border-gray-100"
                        >
                          <td className="px-2 py-2 sm:px-3">
                            <span className="font-medium text-gray-900">
                              {item.name}
                            </span>
                          </td>
                          <td className="px-1 py-2 text-center">
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) =>
                                updateCartQty(i, e.target.value)
                              }
                              max={item.maxStock}
                              min="1"
                              className="mx-auto h-8 w-12 rounded border bg-white text-center text-xs font-bold"
                            />
                          </td>
                          <td className="px-1 py-2 text-right text-xs sm:text-sm">
                            {amount(item.price)}
                          </td>
                          <td className="px-1 py-2 text-right text-xs font-bold sm:text-sm">
                            {amount(item.subtotal)}
                          </td>
                          <td className="px-1 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeCartItem(i)}
                              className="text-xs font-bold text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-gray-200 p-2 sm:p-3">
          <button
            type="button"
            onClick={clearExchange}
            className="flex min-h-12 items-center justify-center rounded-md bg-rose-500 text-sm font-bold text-white hover:bg-rose-600"
          >
            Clear Exchange
          </button>
          <button
            type="button"
            onClick={handleProceedToExchangeCheckout}
            disabled={returnedItems.length === 0 || newItems.length === 0}
            className={`flex min-h-12 items-center justify-center gap-1 rounded-md text-sm font-bold text-white ${
              returnedItems.length === 0 || newItems.length === 0
                ? "cursor-not-allowed bg-gray-300 text-gray-500"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            Continue
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
