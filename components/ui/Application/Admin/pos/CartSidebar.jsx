"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setDiscount,
  setVat,
  selectPosSummary,
} from "@/store/reducer/posCartSlice";
import { showToast } from "@/lib/showToast";

export default function CartSidebar({
  expanded,
  setExpanded,
  cart = [],
  products = [],
  addToCart,
  removeCartItem,
  increaseQty,
  decreaseQty,
  searchTerm = "",
  setSearchTerm,
  customers = [],
  selectedCustomer,
  setSelectedCustomer,
  onAddNewCustomer,
  exchangeTotal = 0,
}) {
  const dispatch = useDispatch();
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const [showDropdown, setShowDropdown] = useState(false);

  // ================= Redux State & Summary =================
  const summary = useSelector(selectPosSummary) || {};
  const {
    subtotal = 0,
    discount = 0,
    vat = 0,
    total = 0,
    totalQty = 0,
  } = summary;

  const discountType = useSelector(
    (state) => state.posCart?.discountType || "fixed",
  );
  const discountValue = useSelector(
    (state) => state.posCart?.discountValue || 0,
  );
  const vatValue = useSelector((state) => state.posCart?.vatValue || 0);

  const currentExchangeTotal = Number(exchangeTotal) || 0;
  const payableAmount = Math.max(
    0,
    (Number(total) || 0) - currentExchangeTotal,
  );

  useEffect(() => {
    console.log("Products:", products.length);
    console.log("Search:", searchTerm);
  }, [products, searchTerm]);

  // ---------------- 1. OPTIMIZED SEARCHABLE ITEMS (useMemo used to prevent Infinite Loop) ----------------
  const allSearchableItems = useMemo(() => {
    const items = [];

    (products || []).forEach((item) => {
      const hasValidProductId =
        item?.productId &&
        typeof item.productId === "object" &&
        Object.keys(item.productId).length > 0;

      const p = hasValidProductId ? item.productId : item;

      const variants = item?.variants?.length
        ? item.variants
        : p?.variants || [];

      if (variants.length > 0) {
        variants.forEach((v) => {
          items.push({
            product: p,
            variant: v,
            variantId: v._id || v.id, // ইউনিক ভ্যারিয়েন্ট আইডি ট্র্যাক করার জন্য দরকার
            name: p?.name || item?.name || "Unnamed",
            barcode: v.barcode || "",
            color: v.color || "",
            size: v.size || "",
            stock: v.showroomStock ?? v.stock ?? 0,
            price: v.sellingPrice || p?.sellingPrice || 0,
          });
        });
      }
    });

    return items;
  }, [products]);

  // ---------------- 2. SEARCH FILTERED RESULTS ----------------
  const searchResults = useMemo(() => {
    const term = (searchTerm || "").trim().toLowerCase();
    if (!term) return [];

    return allSearchableItems.filter(
      (i) =>
        i.name.toLowerCase().includes(term) ||
        i.barcode.toLowerCase().includes(term) ||
        (i.color && i.color.toLowerCase().includes(term)) ||
        (i.size && i.size.toLowerCase().includes(term)),
    );
  }, [searchTerm, allSearchableItems]);

  // ---------------- 3. AUTO SHOW/HIDE DROPDOWN ----------------
  useEffect(() => {
    if ((searchTerm || "").trim() && searchResults.length > 0) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [searchTerm, searchResults]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current?.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ---------------- HANDLE ADD TO CART ----------------
  const handleSelectItem = (item) => {
    // কার্টে অলরেডি আইটেমটি কত পিস আছে তা চেক করা
    const existingCartItem = cart.find(
      (cartItem) =>
        (cartItem.variantId || cartItem.id) === (item.variantId || item.id),
    );
    const currentQtyInCart = existingCartItem
      ? Number(existingCartItem.qty)
      : 0;
    const maxStock = Number(item.stock) || 0;

    // স্টক শেষ হলে বা স্টক লিমিট ক্রস করলে
    if (maxStock <= 0 || currentQtyInCart >= maxStock) {
      showToast(
        "error",
        `"${item.name}" স্টক লিমিট শেষ! সর্বোচ্চ ${maxStock} পিস পাওয়া যাবে।`,
      );
      return;
    }

    if (addToCart && item.product) {
      addToCart(item.product, item.variant, 1);

      showToast("success", `"${item.name}" কার্টে যোগ করা হয়েছে!`);

      if (setSearchTerm) setSearchTerm("");
      setShowDropdown(false);
      inputRef.current?.focus();
    }
  };

  // ---------------- HANDLE INCREASE QTY WITH STOCK CHECK ----------------
  const handleIncreaseQty = (item) => {
    const currentQty = Number(item.qty) || 0;

    // মেইন প্রোডাক্ট লিস্ট বা সার্চ আইটেম থেকে আসল স্টক খুঁজে বের করা
    const targetSearchItem = allSearchableItems.find(
      (i) => (i.variantId || i.id) === (item.variantId || item.id),
    );

    // আইটেমের নিজস্ব অবজেক্টে স্টক না থাকলে ওভারঅল লিস্ট থেকে নেব, অন্যথায় আইটেমের স্টক ধরব
    const maxStock = Number(targetSearchItem?.stock ?? item.stock) || 0;

    if (maxStock > 0 && currentQty >= maxStock) {
      showToast(
        "error",
        `স্টক লিমিট শেষ! সর্বোচ্চ ${maxStock} পিস পাওয়া যাবে।`,
      );
      return;
    }

    if (increaseQty) {
      increaseQty(item.variantId || item.id);
    }
  };

  // ---------------- BARCODE SCANNER (ENTER PRESS AUTO-ADD) ----------------
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const code = (searchTerm || "").trim().toLowerCase();
      if (!code) return;

      // ১. পারফেক্ট বারকোড ম্যাচ খোঁজা
      let matchedItem = allSearchableItems.find(
        (i) => i.barcode && i.barcode.toLowerCase() === code,
      );

      // ২. পারফেক্ট ম্যাচ না পেলে ১ম রিজাল্ট অ্যাড হবে
      if (!matchedItem && searchResults.length > 0) {
        matchedItem = searchResults[0];
      }

      if (matchedItem) {
        handleSelectItem(matchedItem);
      } else {
        showToast("error", "কোনো প্রোডাক্ট পাওয়া যায়নি!");
      }
    }
  };

  return (
    <div className="lg:col-span-6 flex h-full min-h-0 w-full flex-col justify-between overflow-hidden border-l border-gray-200 bg-white text-base">
      {/* ================= 1. TOP HEADER: Search & Customer ================= */}
      <div className="p-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          title={expanded ? "Collapse Cart" : "Expand Cart"}
          className="w-11 h-11 bg-[#1d3557] hover:bg-[#15263f] text-white rounded flex items-center justify-center transition shrink-0 cursor-pointer"
        >
          <span className="text-2xl leading-none font-semibold">⇄</span>
        </button>

        {/* SEARCH BAR */}
        <div className="relative flex-1 min-w-[200px]">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder="Search Name / Scan Barcode..."
              className="w-full pl-9 pr-8 py-2 border-2 border-blue-400 focus:border-blue-600 rounded-md text-sm font-medium outline-none bg-white text-gray-900 shadow-sm transition-all"
            />
            <span className="absolute left-2.5 top-2.5 text-gray-400 text-base">
              🔍
            </span>
            {searchTerm && (
              <span
                onClick={() => {
                  if (setSearchTerm) setSearchTerm("");
                  setShowDropdown(false);
                }}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </span>
            )}
          </div>

          {/* SEARCH DROPDOWN */}
          {showDropdown && searchResults.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-300 rounded-md shadow-2xl max-h-80 overflow-y-auto z-50 divide-y divide-gray-200"
            >
              {searchResults.map((item, idx) => {
                const isOutOfStock = item.stock <= 0;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectItem(item)}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                      isOutOfStock
                        ? "bg-red-100/80 hover:bg-red-200 text-gray-800"
                        : "bg-white hover:bg-blue-50 text-gray-800"
                    }`}
                  >
                    <div className="truncate pr-2 flex-1">
                      <span>{item.name}</span>
                      {item.barcode && (
                        <span className="text-gray-600">
                          {" "}
                          - ({item.barcode})
                        </span>
                      )}
                      {(item.color || item.size) && (
                        <span className="text-gray-600 font-normal">
                          {" "}
                          ( {item.color} {item.color && item.size ? "-" : ""}{" "}
                          {item.size} )
                        </span>
                      )}
                    </div>

                    <div className="shrink-0 font-bold text-right text-gray-900 ml-2">
                      Qty: {item.stock}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================= 2. MIDDLE SECTION: Scrollable Items ================= */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        <div className="grid grid-cols-12 bg-[#1d3557] text-white py-2 px-3 text-xs font-semibold sticky top-0 z-10 items-center text-center">
          <div className="col-span-6 text-left">Name</div>
          <div className="col-span-2">Price</div>
          <div className="col-span-2">Qty</div>
          <div className="col-span-1">Total</div>
          <div className="col-span-1">🗑️</div>
        </div>

        <div className="divide-y divide-gray-100">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-2xl mb-1">🛍️</p>
              <p className="text-xs font-medium">No products added</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={item.variantId || item.id || idx}
                className="grid grid-cols-12 gap-1 p-2.5 items-center text-sm hover:bg-gray-50 border-b border-gray-100"
              >
                <div className="col-span-6 pr-1">
                  <p className="font-bold text-gray-900 text-sm line-clamp-1">
                    {item.name} {item.stock ? `(${item.stock})` : ""}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {item.barcode ? `Barcode: ${item.barcode} ` : ""}
                    {item.color ? `${item.color} - ` : ""}
                    {item.size ? item.size : ""}
                  </p>
                </div>

                <div className="col-span-2 text-center font-semibold text-gray-800 text-sm">
                  {item.price}
                </div>

                <div className="col-span-2 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      decreaseQty && decreaseQty(item.variantId || item.id)
                    }
                    className="w-5 h-5 bg-pink-600 hover:bg-pink-700 text-white font-bold flex items-center justify-center rounded-l text-xs"
                  >
                    -
                  </button>
                  <span className="w-7 h-5 border-t border-b text-center font-bold flex items-center justify-center bg-white text-gray-900 text-xs">
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleIncreaseQty(item)}
                    className="w-5 h-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold flex items-center justify-center rounded-r text-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="col-span-1 text-center font-bold text-gray-900 text-sm">
                  {(Number(item.price) || 0) * (Number(item.qty) || 0)}
                </div>

                <div className="col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      removeCartItem &&
                      removeCartItem(item.variantId || item.id)
                    }
                    className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded font-bold flex items-center justify-center mx-auto text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ================= 3. BOTTOM SECTION: Billing Summary ================= */}
      <div className="bg-[#fdf6ed] border-t border-orange-200 text-xs flex-shrink-0 divide-y divide-orange-200/60">
        <div className="flex justify-between items-center px-3 py-1 font-semibold text-gray-700">
          <div>
            <span>Items</span>
            <span className="font-bold text-black ml-3">{cart.length}</span>
          </div>
          <div>
            <span>Subtotal</span>
            <span className="font-bold text-black ml-3">
              TK {(subtotal ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center px-3 py-1 font-semibold text-gray-700">
          <div>
            <span>Quantity</span>
            <span className="font-bold text-black ml-3">{totalQty}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="mr-1">Discount 📝</span>
            <select
              value={discountType}
              onChange={(e) =>
                dispatch(
                  setDiscount({
                    type: e.target.value,
                    value: discountValue,
                  }),
                )
              }
              className="p-0.5 border border-gray-300 rounded text-[11px] bg-white outline-none"
            >
              <option value="fixed">TK</option>
              <option value="percent">%</option>
            </select>

            <input
              type="number"
              min="0"
              value={discountValue}
              onFocus={(e) => e.target.select()}
              onChange={(e) =>
                dispatch(
                  setDiscount({
                    type: discountType,
                    value: Number(e.target.value) || 0,
                  }),
                )
              }
              className="w-12 p-0.5 border border-gray-300 rounded text-center font-bold bg-white outline-none focus:border-blue-500 text-[11px]"
            />
            <span className="font-bold text-black ml-1">
              TK {(discount ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center px-3 py-1 font-semibold text-gray-700 bg-orange-100/40">
          <div className="flex items-center gap-1.5">
            <span>VAT</span>
            <select
              value={vatValue}
              onChange={(e) =>
                dispatch(
                  setVat({
                    type: "percent",
                    value: Number(e.target.value),
                  }),
                )
              }
              className="p-0.5 border border-gray-300 rounded text-[11px] bg-white font-bold outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={0}>0%</option>
              <option value={7.5}>7.5%</option>
            </select>

            <span className="font-bold text-black ml-1">
              TK {(vat ?? 0).toLocaleString()}
            </span>
          </div>

          <div>
            <span>Net Total</span>
            <span className="font-bold text-black ml-3">
              TK {(total ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        {currentExchangeTotal > 0 && (
          <div className="flex justify-between items-center px-3 py-1 font-semibold text-gray-700">
            <span className="font-bold text-black">Exchange Total</span>
            <span className="font-bold text-black">
              TK {(currentExchangeTotal ?? 0).toLocaleString()}
            </span>
          </div>
        )}

        <div className="p-2.5 bg-[#e8decb] flex items-center justify-between gap-2">
          <span className="text-xs uppercase font-bold text-gray-700">
            Payable Amount
          </span>
          <span className="text-lg font-black text-black">
            TK {(payableAmount ?? 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
