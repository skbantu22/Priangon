"use client";

import { useEffect, useState } from "react";

export default function ExchangeModal({
  isOpen,
  onClose,
  showroomId,
  onOpenCheckout,
  currentPosCart = [], // 👈 ১. মেইন POS কার্ট রিসিভ করার প্রপস যোগ করা হয়েছে
}) {
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [originalOrder, setOriginalOrder] = useState(null);

  // Core Arrays
  const [returnedItems, setReturnedItems] = useState([]);
  const [newItems, setNewItems] = useState([]); // Operational Exchange Cart Tray

  const [reason, setReason] = useState("");

  // Product Search
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);

  // 👈 ২. মডাল ওপেন হলে মেইন কার্ট আইটেমগুলোকে অটোমেটিক এক্সচেঞ্জ ট্রিতে সিঙ্ক করার ইফেক্ট
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
              99, // সেফটি ব্যাকআপ স্টক
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

        console.log(
          "Synced current POS cart items directly to exchange tray:",
          preLoadedItems,
        );
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
  // SEARCH INVOICE (With HTML Error Safeguards)
  // ==========================================
  const searchOrder = async () => {
    if (!orderNumber) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/showroom-orders?orderNumber=${orderNumber}`,
      );

      // Prevent crashing if Next.js returns an HTML error page (404/500)
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Server HTML Error Response:", errorText);
        alert(
          `Failed to load invoice (${res.status}). See server terminal logs.`,
        );
        return;
      }

      const data = await res.json();

      if (data?.order) {
        setOriginalOrder(data.order);
      } else {
        alert("Invoice not found!");
        setOriginalOrder(null);
      }
    } catch (err) {
      console.error("Order Search Error:", err);
      alert("An unexpected error occurred while looking up the invoice.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // SEARCH PRODUCTS (With Robust Data Mapping)
  // ==========================================
  const searchProducts = async () => {
    if (!search.trim()) return;

    try {
      const res = await fetch(
        `/api/wirehouse-stock?showroomId=${showroomId}&q=${search}`,
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

  // ==========================================
  // TOGGLE RETURNED ITEMS (With Safe Deep Checking)
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

  // রিটার্ন আইটেমের কোয়ান্টিটি কমানো/বাড়ানো যদি কাস্টমার আংশিক রিটার্ন করতে চায়
  const updateReturnQty = (variantId, newQty) => {
    const val = parseInt(newQty) || 1;
    setReturnedItems((prev) =>
      prev.map((item) => {
        if (item.variantId === variantId) {
          if (val > item.maxQty) {
            alert(`Cannot return more than purchased qty (${item.maxQty}) ❌`);
            return item;
          }
          return { ...item, qty: val, subtotal: val * item.price };
        }
        return item;
      }),
    );
  };

  // ==========================================
  // FIXED NEW CART SYSTEM (Handles Stock Validation)
  // ==========================================
  const addToCart = (stockItem) => {
    const nestedProduct = stockItem?.productId || {};
    const nestedVariant = stockItem?.variantId || {};

    const targetProductId =
      nestedProduct._id || stockItem?.productId || stockItem?._id;

    // 🛠️ ফিক্সড: আইডি ফ্ল্যাট বা নেস্টেড যাই হোক রিড করবে সেফলি
    const targetVariantId =
      nestedVariant._id || stockItem?.variantId || stockItem?._id;

    const availableStock = parseInt(
      nestedVariant.showroomStock ||
        nestedVariant.stock ||
        stockItem?.stock ||
        99, // ব্যাকআপ স্টক ভ্যালু যাতে এপিআই এর ভুলের জন্য ব্লক না হয়
    );

    if (!targetVariantId) {
      console.error("Missing variant properties!", stockItem);
      alert("Cannot add item: Variant identifier properties are missing.");
      return;
    }

    if (availableStock <= 0) {
      alert("This item is completely out of stock in this showroom! ❌");
      return;
    }

    const existsIndex = newItems.findIndex(
      (item) => item.variantId === targetVariantId,
    );

    if (existsIndex > -1) {
      const updated = [...newItems];
      if (updated[existsIndex].qty + 1 > availableStock) {
        alert(
          `Not enough stock available! Only ${availableStock} pcs in stock.`,
        );
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
            coreProduct?.media?.[0]?.secure_url ||
            coreProduct?.media?.[0]?.url ||
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
      alert(`Only ${updated[index].maxStock} pcs available in stock ❌`);
      return;
    }
    updated[index].qty = val;
    updated[index].subtotal = val * updated[index].price;
    setNewItems(updated);
  };

  const removeCartItem = (index) => {
    setNewItems(newItems.filter((_, i) => i !== index));
  };

  // ==========================================
  // CALCULATIONS BAR
  // ==========================================
  const returnedTotal = returnedItems.reduce((sum, i) => sum + i.subtotal, 0);
  const newTotal = newItems.reduce((sum, i) => sum + i.subtotal, 0);
  const difference = newTotal - returnedTotal;

  // ==========================================
  // ROUTE DYNAMICALLY TO CHECKOUT MODAL
  // ==========================================
  const handleProceedToExchangeCheckout = () => {
    if (returnedItems.length === 0) {
      alert("Please select at least one item to return!");
      return;
    }
    if (newItems.length === 0) {
      alert("Please add at least one new item to cart!");
      return;
    }

    onOpenCheckout({
      isExchangeMode: true,
      total: difference,
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-7xl shadow-2xl rounded-none flex flex-col max-h-[92vh]">
        {/* HEADER */}
        <div className="bg-orange-500 text-white p-4 text-center font-bold text-xl flex-shrink-0 relative">
          🔄 Showroom Product Exchange Terminal
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 hover:text-gray-200 transition text-lg"
          >
            ✕
          </button>
        </div>

        {/* BODY CONTAINER */}
        <div className="flex-1 overflow-y-auto grid grid-cols-12 gap-0">
          {/* ================= LEFT SIDEBAR: FETCH INVOICE (3/12 COLS) ================= */}
          <div className="col-span-3 p-4 border-r border-gray-200 bg-gray-50/50 space-y-4">
            <div className="text-xs font-bold uppercase text-gray-500 tracking-wider">
              Locate Document
            </div>
            <div className="flex gap-1">
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchOrder()}
                className="flex-1 border p-2 text-sm rounded-none focus:outline-orange-500"
                placeholder="Invoice No (e.g. 2026101)"
              />
              <button
                type="button"
                onClick={searchOrder}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 font-medium text-sm transition"
              >
                {loading ? "..." : "Load"}
              </button>
            </div>

            {originalOrder && (
              <div className="border border-gray-200 bg-white p-3 space-y-2">
                <div className="font-bold text-xs border-b pb-1 text-gray-700 uppercase">
                  Customer:{" "}
                  <span className="text-blue-600">
                    {originalOrder.customerName || "Guest"}
                  </span>
                </div>
                <div className="text-xs font-bold text-gray-500 mb-1">
                  Select Items Being Returned:
                </div>
                <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                  {(originalOrder.items || []).map((item, i) => {
                    const uniqueId =
                      item.variantId?._id || item.variantId || item._id;
                    const isChecked = returnedItems.some(
                      (r) => r.variantId === uniqueId,
                    );
                    return (
                      <label
                        key={i}
                        className={`flex items-start gap-2 p-2 border cursor-pointer select-none transition ${
                          isChecked
                            ? "border-orange-500 bg-orange-50/40"
                            : "border-gray-100 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleReturnItem(item)}
                          className="mt-0.5 accent-orange-600"
                        />
                        <div className="text-xs flex-1">
                          <div className="font-medium text-gray-900">
                            {item.name || item.productName}
                          </div>
                          <div className="text-gray-500">
                            Bought Qty: {item.qty} x{" "}
                            {item.price || item.sellingPrice} TK
                          </div>
                        </div>
                        <span className="text-xs font-bold text-gray-900">
                          {item.subtotal || item.price * item.qty}৳
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ================= MIDDLE PANEL: RETURN CART SUMMARY (4/12 COLS) ================= */}
          <div className="col-span-4 p-4 border-r border-gray-200 flex flex-col bg-white">
            <div className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">
              1. Items Coming In (Returns)
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto border border-dashed border-gray-200 p-2 bg-gray-50/30">
              {returnedItems.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
                  No items checked for return yet
                </div>
              ) : (
                returnedItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center bg-red-50 border border-red-200 p-2.5 text-xs"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-red-900">
                        {item.name}
                      </div>
                      <div className="text-gray-500">
                        Unit Cost: {item.price} TK
                      </div>
                    </div>

                    {/* রিটার্ন কোয়ান্টিটি ইনপুট এডজাস্টমেন্ট */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500">Qty:</span>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) =>
                          updateReturnQty(item.variantId, e.target.value)
                        }
                        max={item.maxQty}
                        min="1"
                        className="w-12 border p-0.5 text-center font-bold bg-white"
                      />
                      <div className="text-right font-bold text-red-700 w-16">
                        -{item.subtotal} ৳
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 bg-red-50 p-3 border border-red-200 font-bold text-red-700 text-sm flex justify-between">
              <span>Total Return Value:</span>
              <span>{returnedTotal.toLocaleString()} TK</span>
            </div>
          </div>

          {/* ================= RIGHT PANEL: CART SYSTEM FOR NEW PRODUCTS (5/12 COLS) ================= */}
          <div className="col-span-5 p-4 flex flex-col bg-white">
            <div className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">
              2. Items Going Out (New Purchase Cart)
            </div>

            {/* Stock Search Header Bar */}
            <div className="flex gap-1 mb-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchProducts()}
                className="flex-1 border p-2 text-sm rounded-none focus:outline-green-500"
                placeholder="Search catalog or barcode..."
              />
              <button
                type="button"
                onClick={searchProducts}
                className="bg-green-600 hover:bg-green-700 text-white px-4 font-medium text-sm transition"
              >
                Find
              </button>
            </div>

            {/* Dropdown Catalog Results Design Style */}
            {products.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-gray-200 bg-white shadow-lg p-2 mb-3 space-y-1">
                {products.map((stockItem, i) => {
                  const coreProduct = stockItem.productId || {};
                  const variantData = stockItem.variantId || {};
                  const currentStock =
                    variantData.showroomStock ||
                    variantData.stock ||
                    stockItem.stock ||
                    0;

                  return (
                    <div
                      key={i}
                      className="p-1.5 border-b border-gray-100 last:border-0 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-xs text-gray-800">
                          {coreProduct.name || "Catalog Product"}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Color: {variantData.color || "N/A"} | Size:{" "}
                          {variantData.size || "Free"} | Stock:{" "}
                          <span className="font-bold text-green-600">
                            {currentStock}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCart(stockItem)}
                        className="bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white transition text-[11px] font-medium px-2 py-1 text-blue-700"
                      >
                        + Add (
                        {variantData.sellingPrice || variantData.price || 0}৳)
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Current Shopping Cart Table List */}
            <div className="flex-1 overflow-y-auto border border-gray-200 min-h-[180px]">
              {newItems.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
                  Cart is currently empty. Add new items above.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b font-semibold text-gray-600">
                      <th className="p-2">Product Description</th>
                      <th className="p-2 text-center w-20">Qty</th>
                      <th className="p-2 text-right w-24">Subtotal</th>
                      <th className="p-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {newItems.map((item, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50/50">
                        <td className="p-2">
                          <div className="font-medium text-gray-900">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {item.color} / {item.size} @ {item.price} TK
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateCartQty(i, e.target.value)}
                            className="w-14 border p-1 text-center font-bold text-sm rounded-none"
                            max={item.maxStock}
                            min="1"
                          />
                        </td>
                        <td className="p-2 text-right font-bold text-gray-900">
                          {item.subtotal.toLocaleString()}৳
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeCartItem(i)}
                            className="text-red-500 font-bold hover:text-red-700"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Right Summary Row Elements */}
            <div className="mt-3 space-y-2">
              <div className="bg-green-50 p-3 border border-green-200 font-bold text-green-700 text-sm flex justify-between">
                <span>Total Outward Value (New Cart):</span>
                <span>{newTotal.toLocaleString()} TK</span>
              </div>

              <div
                className={`p-3 font-bold text-sm flex justify-between border ${
                  difference >= 0
                    ? "bg-orange-50 border-orange-200 text-orange-700"
                    : "bg-purple-50 border-purple-200 text-purple-700"
                }`}
              >
                <span>Net Difference adjustment:</span>
                <span>
                  {difference >= 0
                    ? `+${difference.toLocaleString()}`
                    : `${difference.toLocaleString()}`}{" "}
                  TK
                </span>
              </div>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full border p-2 text-xs resize-none rounded-none focus:outline-orange-500"
                placeholder="Reason for Exchange (e.g. Size didn't fit client properly)..."
              />
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS BAR */}
        <div className="flex justify-between p-4 border-t bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-2.5 font-bold rounded-none transition"
          >
            Close Window
          </button>

          <button
            type="button"
            onClick={handleProceedToExchangeCheckout}
            disabled={returnedItems.length === 0 || newItems.length === 0}
            className={`px-10 py-2.5 font-bold rounded-none transition text-white ${
              returnedItems.length === 0 || newItems.length === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            Proceed to Payment / Refund ➔
          </button>
        </div>
      </div>
    </div>
  );
}
