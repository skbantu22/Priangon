"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { skipOptimize } from "@/lib/imageSrc";
import { useDispatch, useSelector } from "react-redux";
import {
  ShoppingBag,
  Trash2,
  X,
  CheckCircle2,
  Pause,
  Printer,
  Maximize2,
  Minimize2,
  User,
  Search,
  Banknote,
  CreditCard,
  Smartphone,
  HandCoins,
  UserPlus,
  ShieldCheck,
} from "lucide-react";
import {
  setDiscount,
  setVat,
  setCustomer,
  clearCustomer,
  updateQty,
  setItemImeis,
  selectPosSummary,
} from "@/store/reducer/posCartSlice";
import { showToast } from "@/lib/showToast";
import { CUSTOMER_TYPES, normalizeCustomerType } from "@/lib/priceTiers";
import { isValidSerial, warrantyLabel } from "@/lib/warranty";

// IMEI / serial inputs, one per unit, for phones and other tracked items
function ImeiInputs({ item }) {
  const dispatch = useDispatch();
  const qty = Number(item.qty) || 1;
  const imeis = Array.from({ length: qty }, (_, i) => item.imeis?.[i] || "");
  const done = imeis.filter(isValidSerial).length;

  const setAt = (index, value) => {
    const next = [...imeis];
    next[index] = value.replace(/\s/g, "");
    dispatch(setItemImeis({ variantId: item.variantId, imeis: next }));
  };

  return (
    <div className="col-span-full -mt-1 flex flex-wrap items-center gap-1.5 pb-1 pl-[24px]">
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
          done === qty
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10"
            : "bg-amber-50 text-amber-700 dark:bg-amber-500/10"
        }`}
      >
        IMEI {done}/{qty}
      </span>
      {imeis.map((value, i) => (
        <input
          key={i}
          value={value}
          onChange={(e) => setAt(i, e.target.value)}
          placeholder={qty > 1 ? `IMEI / Serial ${i + 1}` : "Scan IMEI / Serial"}
          maxLength={20}
          className={`h-7 w-36 rounded-md border px-2 font-mono text-[11px] outline-none focus:border-primary dark:bg-transparent ${
            value && !isValidSerial(value)
              ? "border-red-300"
              : "border-gray-200 dark:border-white/10"
          }`}
        />
      ))}
    </div>
  );
}

const money = (n) =>
  `৳${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const METHODS = [
  { key: "Cash", icon: Banknote },
  { key: "Card", icon: CreditCard },
  { key: "Mobile Banking", icon: Smartphone },
  { key: "Due", icon: HandCoins },
];

const MOBILE_BANKING = ["bKash", "Nagad", "Rocket", "Upay"];

const isPhone = (s) => /^01\d{9}$/.test(String(s).trim());

// ---------------------------------------------------------------------------
// Customer picker: search existing customers, or type a new name / phone
// ---------------------------------------------------------------------------
function CustomerPicker() {
  const dispatch = useDispatch();
  const customer = useSelector((state) => state.posCart?.customer);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/customer/search?q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        setResults(data.customers || []);
        setOpen(true);
      } catch {
        // aborted or offline: keep the old list
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const close = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (c) => {
    dispatch(
      setCustomer({
        _id: c._id || null,
        name: c.name || "",
        phone: c.phone || "",
        address: c.address || "",
        // dealer / retailer... : the cart switches to that rate
        type: normalizeCustomerType(c.type),
      }),
    );
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const inputClass =
    "h-9 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] outline-none focus:border-primary dark:border-white/10 dark:bg-transparent";

  return (
    <div ref={boxRef} className="relative">
      <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-gray-800 dark:text-gray-100">
        <User className="size-4 text-primary" />
        Customer <span className="font-normal text-gray-400">(Optional)</span>
      </p>

      {customer ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
          <div className="flex gap-2">
            <input
              value={customer.name}
              onChange={(e) =>
                dispatch(setCustomer({ ...customer, name: e.target.value }))
              }
              placeholder="Customer name"
              className={inputClass}
            />
            <input
              value={customer.phone}
              onChange={(e) =>
                dispatch(
                  setCustomer({ ...customer, _id: null, phone: e.target.value }),
                )
              }
              placeholder="01XXXXXXXXX"
              inputMode="tel"
              className={`${inputClass} max-w-32`}
            />
            <button
              type="button"
              onClick={() => dispatch(clearCustomer())}
              title="Walk-in customer"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <select
              value={normalizeCustomerType(customer.type)}
              onChange={(e) =>
                dispatch(setCustomer({ ...customer, type: e.target.value }))
              }
              title="Customer type: sets the rate"
              className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-[12px] font-medium outline-none focus:border-primary dark:border-white/10 dark:bg-transparent"
            >
              {Object.entries(CUSTOMER_TYPES).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.label}
                </option>
              ))}
            </select>
            {normalizeCustomerType(customer.type) !== "retail" && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                {CUSTOMER_TYPES[normalizeCustomerType(customer.type)].short} rate applied
              </span>
            )}
            {customer._id && (
              <span className="ml-auto text-[11px] text-primary">
                Existing customer
              </span>
            )}
          </div>
        </div>
      ) : (
        <label className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 focus-within:border-primary dark:border-white/10 dark:bg-transparent">
          <User className="size-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder="Walk-in Customer"
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
          />
          <Search className="size-4 text-primary" />
        </label>
      )}

      {open && !customer && query.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-card">
          {results.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => pick(c)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-primary/5"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium">
                  {c.name}
                </span>
                <span className="text-[11px] text-gray-500">{c.phone}</span>
              </span>
              <span className="shrink-0 text-right text-[11px] text-gray-400">
                {normalizeCustomerType(c.type) !== "retail" && (
                  <span className="block font-semibold text-emerald-600">
                    {CUSTOMER_TYPES[normalizeCustomerType(c.type)].short}
                  </span>
                )}
                {c.totalOrders || 0} orders
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              pick(
                isPhone(query)
                  ? { name: "", phone: query.trim() }
                  : { name: query.trim(), phone: "" },
              )
            }
            className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-[13px] font-medium text-primary hover:bg-primary/5 dark:border-white/10"
          >
            <UserPlus className="size-4" />
            Add “{query.trim()}” as new customer
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function CartSidebar({
  expanded,
  setExpanded,
  cart = [],
  products = [],
  removeCartItem,
  onComplete,
  onHold,
  onClear,
  onPrint,
  canPrint = false,
  checkoutLoading = false,
}) {
  const dispatch = useDispatch();

  // ================= Redux State & Summary =================
  const summary = useSelector(selectPosSummary) || {};
  const { subtotal = 0, discount = 0, vat = 0, total = 0, totalQty = 0 } =
    summary;

  const discountType = useSelector(
    (state) => state.posCart?.discountType || "fixed",
  );
  const discountValue = useSelector(
    (state) => state.posCart?.discountValue || 0,
  );
  const vatValue = useSelector((state) => state.posCart?.vatValue || 0);
  const customer = useSelector((state) => state.posCart?.customer);

  // ================= Payment =================
  const [method, setMethod] = useState("Cash");
  const [mbOption, setMbOption] = useState(MOBILE_BANKING[0]);
  // null = follow the total automatically until the cashier types an amount
  const [receivedInput, setReceivedInput] = useState(null);

  const defaultReceived = method === "Due" ? 0 : Math.round(total * 100) / 100;
  const received =
    receivedInput === null ? defaultReceived : Number(receivedInput) || 0;
  const change = Math.max(0, received - total);
  const due = Math.max(0, Math.round((total - received) * 100) / 100);

  const chooseMethod = (key) => {
    setMethod(key);
    setReceivedInput(null);
  };

  // variantId -> available stock, so qty can't go past what's on the shelf
  const stockByVariant = useMemo(() => {
    const map = new Map();
    (products || []).forEach((item) => {
      const p =
        item?.productId && typeof item.productId === "object"
          ? item.productId
          : item;
      const variants = item?.variants?.length
        ? item.variants
        : p?.variants || [];
      variants.forEach((v) =>
        map.set(v._id || v.id, Number(v.showroomStock ?? v.stock ?? 0)),
      );
    });
    return map;
  }, [products]);

  const changeQty = (item, value) => {
    const id = item.variantId || item.id;
    const maxStock = stockByVariant.get(id);
    let qty = Math.max(1, Math.floor(Number(value) || 1));

    if (maxStock > 0 && qty > maxStock) {
      showToast("error", `স্টক লিমিট শেষ! সর্বোচ্চ ${maxStock} পিস পাওয়া যাবে।`);
      qty = maxStock;
    }

    dispatch(updateQty({ variantId: id, qty }));
  };

  const complete = () => {
    if (!cart.length) {
      showToast("error", "Cart is empty");
      return;
    }

    // 🛡️ every phone / tracked unit needs its own valid IMEI or serial
    const serials = [];
    for (const item of cart) {
      if (!item.trackSerial) continue;
      const list = (item.imeis || []).slice(0, Number(item.qty));
      if (list.length < Number(item.qty) || !list.every(isValidSerial)) {
        showToast(
          "error",
          `${item.name}: enter ${item.qty} valid IMEI / serial number(s)`,
        );
        return;
      }
      serials.push(...list);
    }
    if (new Set(serials).size !== serials.length) {
      showToast("error", "The same IMEI / serial is entered twice");
      return;
    }

    if (method !== "Due" && due > 0) {
      showToast(
        "error",
        "Received amount is less than the total. Choose “Due” for a partial payment.",
      );
      return;
    }

    if (due > 0 && !isPhone(customer?.phone || "")) {
      showToast("error", "Due sale: add the customer's phone number (01XXXXXXXXX).");
      return;
    }

    const paid = Math.min(received, total);

    onComplete({
      payments: [
        {
          type: method === "Due" ? "Cash" : method,
          option: method === "Mobile Banking" ? mbOption : "",
          amount: paid,
        },
      ],
      customerId: customer?._id || null,
      customerName: customer?.name || "Walk-in Customer",
      phone: customer?.phone || "",
      address: customer?.address || "",
      customerType: normalizeCustomerType(customer?.type),
    });
  };

  // F2 in the page triggers this panel's Complete Sale
  useEffect(() => {
    const onKey = () => complete();
    window.addEventListener("pos:complete-sale", onKey);
    return () => window.removeEventListener("pos:complete-sale", onKey);
  });

  const inputBox =
    "h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] outline-none focus:border-primary dark:border-white/10 dark:bg-transparent";

  return (
    <aside
      className={`flex h-full min-h-0 flex-col overflow-y-auto border-l border-gray-200 bg-white dark:border-white/10 dark:bg-card ${
        expanded ? "flex-1" : "w-full shrink-0 lg:w-[410px] 2xl:w-[440px]"
      }`}
    >
      {/* ================= HEADER ================= */}
      <div className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-3">
        <ShoppingBag className="size-5 text-primary" strokeWidth={2.5} />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Current Sale
        </h2>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Show products" : "Expand cart"}
            className="hidden size-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 lg:flex dark:hover:bg-white/10"
          >
            {expanded ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={!cart.length}
            title="Clear all"
            className="flex size-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-500/10"
          >
            <Trash2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={!cart.length}
            className="h-9 rounded-lg bg-red-50 px-3 text-[13px] font-medium text-red-600 hover:bg-red-100 disabled:opacity-40 dark:bg-red-500/10"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* ================= ITEMS ================= */}
      <div className="mx-3 flex min-h-30 flex-1 flex-col overflow-hidden rounded-xl border border-gray-100 dark:border-white/10">
        <div className="grid shrink-0 grid-cols-[18px_minmax(0,1fr)_52px_62px_66px_22px] items-center gap-1.5 bg-gray-50 px-3 py-2.5 text-[12px] font-semibold text-gray-600 dark:bg-white/5 dark:text-gray-300">
          <span>#</span>
          <span>Product</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Price</span>
          <span className="text-right">Total</span>
          <span />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-1.5 text-gray-400">
              <ShoppingBag className="size-9" />
              <p className="text-sm font-medium">No products added</p>
              <p className="text-xs">Scan a barcode or tap a product</p>
            </div>
          ) : (
            cart.map((item, idx) => {
              const id = item.variantId || item.id;
              return (
                <div
                  key={id || idx}
                  className="grid grid-cols-[18px_minmax(0,1fr)_52px_62px_66px_22px] items-center gap-1.5 border-t border-gray-100 px-3 py-2 first:border-t-0 dark:border-white/10"
                >
                  <span className="text-[12px] text-gray-500">{idx + 1}</span>

                  <div className="flex min-w-0 items-center gap-2">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-gray-50">
                      <Image
                        src={item.image || "/placeholder.png"}
                        alt={item.name || ""}
                        fill
                        sizes="40px"
                        className="object-contain"
                        unoptimized={skipOptimize(item.image)}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[12px] font-medium leading-tight text-gray-900 dark:text-gray-100">
                        {item.name}
                      </p>
                      <p className="truncate text-[11px] text-gray-500">
                        {[item.size, item.color].filter(Boolean).join(" · ")}
                      </p>
                      {warrantyLabel(item) && (
                        <p className="flex items-center gap-1 truncate text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                          <ShieldCheck className="size-3 shrink-0" />
                          {warrantyLabel(item)}
                        </p>
                      )}
                    </div>
                  </div>

                  <input
                    type="number"
                    min={1}
                    value={item.qty}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => changeQty(item, e.target.value)}
                    className="h-8 w-full rounded-md border border-gray-200 bg-white px-1.5 text-center text-[13px] font-semibold outline-none focus:border-primary dark:border-white/10 dark:bg-transparent"
                  />

                  <span className="text-right text-[12px] text-gray-700 dark:text-gray-300">
                    {money(item.price)}
                  </span>

                  <span className="text-right text-[12px] font-bold text-gray-900 dark:text-white">
                    {money((Number(item.price) || 0) * (Number(item.qty) || 0))}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeCartItem?.(id)}
                    title="Remove"
                    className="flex size-5.5 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10"
                  >
                    <X className="size-3" strokeWidth={3} />
                  </button>

                  {item.trackSerial && <ImeiInputs item={item} />}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="shrink-0 space-y-2.5 px-4 pt-2.5">
        {/* ================= CUSTOMER ================= */}
        <CustomerPicker />

        {/* ================= SUMMARY ================= */}
        <div className="space-y-1.5 border-t border-gray-100 pt-2 text-[13px] dark:border-white/10">
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>
              Subtotal ({totalQty} items)
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {money(subtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-gray-600 dark:text-gray-300">
            <span>Discount</span>
            <div className="flex items-center gap-1.5">
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
                className={`${inputBox} w-20`}
              />
              <select
                value={discountType}
                onChange={(e) =>
                  dispatch(
                    setDiscount({ type: e.target.value, value: discountValue }),
                  )
                }
                className={`${inputBox} w-14 px-1.5`}
              >
                <option value="percent">%</option>
                <option value="fixed">৳</option>
              </select>
            </div>
            <span className="w-20 text-right font-semibold text-gray-900 dark:text-white">
              {money(discount)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1.5">
              VAT
              <select
                value={vatValue}
                onChange={(e) =>
                  dispatch(
                    setVat({ type: "percent", value: Number(e.target.value) }),
                  )
                }
                className="rounded border border-gray-200 bg-transparent px-1 py-0.5 text-[12px] outline-none dark:border-white/10"
              >
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={7.5}>7.5%</option>
                <option value={15}>15%</option>
              </select>
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {money(vat)}
            </span>
          </div>
        </div>

        {/* ================= TOTAL ================= */}
        <div className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-2">
          <span className="text-base font-bold text-primary">Total Amount</span>
          <span className="text-[24px] font-extrabold leading-none text-primary">
            {money(total)}
          </span>
        </div>

        {/* ================= PAYMENT METHOD ================= */}
        <div className="grid grid-cols-4 gap-1.5">
          {METHODS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => chooseMethod(key)}
              className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border px-1 text-[12px] font-medium transition ${
                method === key
                  ? "border-primary bg-primary text-white shadow-md shadow-primary/30"
                  : "border-gray-200 bg-white text-gray-700 hover:border-primary/50 dark:border-white/10 dark:bg-transparent dark:text-gray-200"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{key}</span>
            </button>
          ))}
        </div>

        {method === "Mobile Banking" && (
          <div className="flex gap-1.5">
            {MOBILE_BANKING.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setMbOption(o)}
                className={`h-8 flex-1 rounded-md border text-[12px] font-medium ${
                  mbOption === o
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 text-gray-600 dark:border-white/10 dark:text-gray-300"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <label className="block">
            <span className="text-gray-600 dark:text-gray-300">
              {method === "Due" ? "Paid Now" : "Received Amount"}
            </span>
            <span className="mt-0.5 flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 focus-within:border-primary dark:border-white/10">
              <span className="text-gray-500">৳</span>
              <input
                type="number"
                min="0"
                value={receivedInput ?? defaultReceived}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setReceivedInput(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none"
              />
            </span>
          </label>
          <div className="text-right">
            <span className="text-gray-600 dark:text-gray-300">
              {due > 0 ? "Due Amount" : "Change Amount"}
            </span>
            <p
              className={`mt-0.5 flex h-9 items-center justify-end text-xl font-extrabold ${
                due > 0 ? "text-red-500" : "text-emerald-600"
              }`}
            >
              {money(due > 0 ? due : change)}
            </p>
          </div>
        </div>
      </div>

      {/* ================= ACTIONS (always visible at the bottom) ================= */}
      <div className="sticky bottom-0 z-10 mt-auto shrink-0 space-y-2 border-t border-gray-100 bg-white px-4 py-3 shadow-[0_-6px_16px_-10px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-card">
        <button
          type="button"
          onClick={complete}
          disabled={checkoutLoading || cart.length === 0}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[16px] font-semibold text-white shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          <CheckCircle2 className="size-5" />
          {checkoutLoading ? "Processing..." : "Complete Sale (F2)"}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onHold}
            disabled={cart.length === 0}
            className="flex h-9 items-center justify-center gap-2 rounded-lg bg-primary/10 text-[13px] font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
          >
            <Pause className="size-4" strokeWidth={3} />
            Save &amp; Hold (F3)
          </button>
          <button
            type="button"
            onClick={onPrint}
            disabled={!canPrint}
            title={canPrint ? "Print last invoice" : "No sale completed yet"}
            className="flex h-9 items-center justify-center gap-2 rounded-lg bg-primary/10 text-[13px] font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
          >
            <Printer className="size-4" />
            Print Invoice (F4)
          </button>
        </div>
      </div>
    </aside>
  );
}
