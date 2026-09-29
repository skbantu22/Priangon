"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ShoppingBag,
  Trash2,
  X,
  Printer,
  Banknote,
  CreditCard,
  Smartphone,
  HandCoins,
  Minus,
  Plus,
  ScanBarcode,
  ArrowLeftRight,
  Pencil,
} from "lucide-react";
import PosCustomerPicker from "./PosCustomerPicker";
import {
  setDiscount,
  setVat,
  updateQty,
  setItemImeis,
  selectPosSummary,
} from "@/store/reducer/posCartSlice";
import { showToast } from "@/lib/showToast";
import { normalizeCustomerType } from "@/lib/priceTiers";
import { isValidSerial } from "@/lib/warranty";

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
  `TK ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const METHODS = [
  { key: "Cash", icon: Banknote },
  { key: "Card", icon: CreditCard },
  { key: "Mobile Banking", icon: Smartphone },
  { key: "Due", icon: HandCoins },
];

const MOBILE_BANKING = ["bKash", "Nagad", "Rocket", "Upay"];

const isPhone = (s) => /^01\d{9}$/.test(String(s).trim());

export default function CartSidebar({
  expanded,
  setExpanded,
  cart = [],
  products = [],
  search = "",
  setSearch,
  inputRef,
  onSearchKeyDown,
  removeCartItem,
  onComplete,
  onClear,
  onPrint,
  onExchange,
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

  const itemCount = cart.length;
  const afterDiscount = total;

  const summaryRow = (label, value, extra = null) => (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-700">{label}</span>
      <span className="flex items-center gap-1 font-semibold tabular-nums text-gray-900">
        {value}
        {extra}
      </span>
    </div>
  );

  return (
    <aside
      className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#e8e8e8] ${
        expanded ? "md:flex-1" : ""
      }`}
    >
      <div className="hidden shrink-0 items-center gap-2 bg-white px-3 py-2 md:flex">
        <button
          type="button"
          onClick={onExchange}
          title="Exchange (F6)"
          className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#3b82f6] text-white shadow-sm hover:brightness-110"
        >
          <ArrowLeftRight className="size-5" />
        </button>
        <input
          type="checkbox"
          className="size-4 shrink-0 rounded border-gray-300 accent-[#2563eb]"
          aria-label="Scan mode"
        />
        <label className="flex h-10 min-w-0 flex-1 items-center overflow-hidden rounded-md border border-gray-300 bg-white focus-within:border-primary">
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch?.(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Enter Product Name / Scan Barcode / SKU"
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-[13px] outline-none"
          />
          <span className="flex h-full w-11 shrink-0 items-center justify-center border-l border-gray-200 bg-gray-50 text-gray-600">
            <ScanBarcode className="size-5" />
          </span>
        </label>
        <div className="min-w-[11rem] shrink-0">
          <PosCustomerPicker amarGuest />
        </div>
      </div>

      <div className="mx-2 mb-2 flex min-h-[120px] flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white sm:mx-3 md:min-h-0">
        <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_52px_72px_56px_28px] items-center gap-1 bg-[#1e3a5f] px-2 py-1.5 text-[11px] font-semibold text-white sm:grid-cols-[minmax(0,1fr)_56px_80px_64px_32px] sm:px-3">
          <span>Name</span>
          <span className="text-right">Price</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Total</span>
          <button
            type="button"
            onClick={onClear}
            disabled={!cart.length}
            title="Clear cart"
            className="flex items-center justify-center disabled:opacity-40"
          >
            <Trash2 className="size-4" />
          </button>
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
                  className="grid grid-cols-[minmax(0,1fr)_52px_72px_56px_28px] items-center gap-1 border-t border-gray-100 px-2 py-2 text-[12px] first:border-t-0 sm:grid-cols-[minmax(0,1fr)_56px_80px_64px_32px] sm:px-3 dark:border-white/10"
                >
                  <div className="min-w-0">
                    <p
                      className="line-clamp-2 font-semibold leading-snug text-gray-900 dark:text-gray-100"
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    {item.barcode ? (
                      <p className="truncate text-[10px] text-gray-500">
                        Barcode: {item.barcode}
                      </p>
                    ) : null}
                  </div>

                  {(() => {
                    const price = Number(item.price) || 0;
                    const qty = Number(item.qty) || 0;
                    return (
                      <>
                        <span className="text-right font-medium tabular-nums">
                          {Math.round(price)}
                        </span>
                        <div className="flex h-7 items-center justify-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => changeQty(item, (Number(item.qty) || 1) - 1)}
                            disabled={(Number(item.qty) || 1) <= 1}
                            aria-label="One less"
                            className="flex size-7 items-center justify-center rounded-sm bg-[#e11d48] text-white disabled:opacity-40"
                          >
                            <Minus className="size-3" strokeWidth={3} />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.qty}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => changeQty(item, e.target.value)}
                            className="h-7 w-8 rounded-sm border border-gray-200 bg-white text-center text-[11px] font-bold outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => changeQty(item, (Number(item.qty) || 1) + 1)}
                            aria-label="One more"
                            className="flex size-7 items-center justify-center rounded-sm bg-[#16a34a] text-white"
                          >
                            <Plus className="size-3" strokeWidth={3} />
                          </button>
                        </div>
                        <span className="text-right font-bold tabular-nums">
                          {Math.round(price * qty)}
                        </span>
                      </>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => removeCartItem?.(id)}
                    title="Remove"
                    className="flex size-7 items-center justify-center rounded bg-red-500 text-white"
                  >
                    <X className="size-3.5" strokeWidth={3} />
                  </button>

                  {item.trackSerial && <ImeiInputs item={item} />}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="shrink-0 space-y-2 px-2 pb-2 pt-1 sm:px-3 md:pb-3">
        <div className="rounded-md bg-[#f5f0e6] p-2.5 text-[11px] sm:text-[12px]">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <div className="space-y-1">
              {summaryRow("Items", itemCount)}
              {summaryRow("Quantity", totalQty)}
              {summaryRow(
                `Total Vat (${vatValue || 0}%)`,
                money(vat),
              )}
            </div>
            <div className="space-y-1">
              {summaryRow("Total", money(subtotal))}
              {summaryRow(
                "Discount",
                money(discount),
                <span className="inline-flex items-center gap-0.5">
                  <Pencil className="size-3 text-gray-500" />
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
                    className={`${inputBox} h-6 w-12 px-1 text-[11px]`}
                  />
                </span>,
              )}
              {summaryRow("After Discount Price", money(afterDiscount))}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[#e8dcc8] pt-2 font-bold text-gray-900">
            <span>Payable</span>
            <span className="text-[15px] tabular-nums">{money(total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 md:hidden">
          {METHODS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => chooseMethod(key)}
              className={`flex h-8 items-center justify-center gap-1 rounded-lg border px-1 text-[11px] font-medium transition ${
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

        <div className="grid grid-cols-2 items-center gap-2 text-[11px] md:hidden">
          <label className="block">
            <span className="text-gray-600 dark:text-gray-300">
              {method === "Due" ? "Paid Now" : "Received"}
            </span>
            <span className="mt-0.5 flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-2 focus-within:border-primary dark:border-white/10">
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
              {due > 0 ? "Due" : "Change"}
            </span>
            <p
              className={`mt-0.5 flex h-8 items-center justify-end text-lg font-extrabold ${
                due > 0 ? "text-red-500" : "text-emerald-600"
              }`}
            >
              {money(due > 0 ? due : change)}
            </p>
          </div>
        </div>
      </div>

      <div className="hidden shrink-0 justify-end gap-1.5 border-t border-gray-100 bg-white px-3 py-2 max-md:flex">
        <button
          type="button"
          onClick={onPrint}
          disabled={!canPrint}
          title={canPrint ? "Print last invoice (F4)" : "No sale completed yet"}
          className="flex h-11 w-14 flex-col items-center justify-center rounded-lg bg-primary/10 text-[10px] font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
        >
          <Printer className="size-4" />
          Print
        </button>
      </div>
    </aside>
  );
}
