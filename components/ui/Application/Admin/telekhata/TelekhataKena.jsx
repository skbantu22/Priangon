"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { FcCalendar, FcDataRecovery, FcMoneyTransfer, FcPrint, FcSimCardChip } from "react-icons/fc";
import { Barcode, CalendarDays, Camera, Funnel, Search, ShoppingBag, SquarePen } from "lucide-react";

import { ADMIN_TELEKHATA } from "@/Route/Adminpannelroute";
import { CUSTOMER_TYPES, normalizeCustomerType, rateForType } from "@/lib/priceTiers";
import { posShowroomsQueryOptions, useOpeningStockTill } from "@/lib/posProducts";
import { showToast } from "@/lib/showToast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductImage } from "./PartyStatement";
import { bnNumber, money, todayInput } from "./telekhataKit";
import { useAccounts } from "@/components/ui/Application/Admin/accounts/accountKit";
import { AppBar, DotsIcon, HelpIcon, PickCard, Screen, Switch } from "./tkUI";

// the payment method name the purchase / sale forms use for an account
const methodOf = (account) => {
  if (account.type === "mobile_banking") return /nagad/i.test(account.name) ? "nagad" : "bkash";
  if (account.type === "cash") return "cash";
  return account.type; // card, bank, cheque
};

const ICONS = { cash: FcMoneyTransfer, mobile_banking: FcSimCardChip, card: FcDataRecovery, bank: FcDataRecovery, cheque: FcDataRecovery };

const BLUE_BTN = "bg-[#1b56d8] text-white";


const num = (value) => Math.max(0, Number(value) || 0);

const RATE_LABEL = {
  retail: "বিক্রয় মূল্য",
  dealer: "ডিলার দর",
  subDealer: "সাব ডিলার দর",
  wholesaler: "পাইকারি দর",
};

function ShareIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-14" aria-hidden="true">
      <rect x="9" y="6" width="26" height="34" rx="4" fill="#fbe9a8" stroke="#3a3a3a" strokeWidth="2.4" />
      <path d="M15 16h14M15 22h14M15 28h9" stroke="#3a3a3a" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="36" cy="34" r="9" fill="#f5a623" stroke="#3a3a3a" strokeWidth="2.2" />
      <path d="M33 34l5-3v6z" fill="#fff" />
    </svg>
  );
}

// Kena (buy): products -> cart -> payment -> receipt, saved as a normal purchase
export default function TelekhataKena({ mode = "buy" }) {
  const sell = mode === "sell";
  const till = useOpeningStockTill();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: showrooms = [] } = useQuery(posShowroomsQueryOptions());

  const [step, setStep] = useState("products");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [picked, setPicked] = useState({}); // variantId -> product + qty / rate / expire / imeis

  const [challan, setChallan] = useState("");
  const [batch, setBatch] = useState("");
  const [discountOn, setDiscountOn] = useState(false);
  const [discount, setDiscount] = useState("");
  const [deliveryOn, setDeliveryOn] = useState(false);
  const [delivery, setDelivery] = useState("");
  const [editRow, setEditRow] = useState(null); // { id, kind: "imei" | "expire" | "edit" }

  const [supplier, setSupplier] = useState(null);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [method, setMethod] = useState("cash");
  const [accountId, setAccountId] = useState("");
  const { accounts } = useAccounts();
  const [cash, setCash] = useState("");
  const [cashTouched, setCashTouched] = useState(false);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayInput());
  const [photoFile, setPhotoFile] = useState(null);
  const [sms, setSms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const searchRef = useRef(null);
  const photoRef = useRef(null);
  const sentinel = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  // a different showroom is a different stock, so start the cart again
  useEffect(() => {
    setPicked({});
    setStep("products");
  }, [till.id]);

  const buyerType = normalizeCustomerType(supplier?.type);
  const askRate = (product) => (sell ? rateForType(product, buyerType) : product.costPrice);

  // the cart follows the customer. a hand-typed rate stays as typed.
  useEffect(() => {
    if (!sell) return;
    setPicked((current) => {
      let changed = false;
      const next = {};
      for (const [id, item] of Object.entries(current)) {
        if (item.rateEdited) {
          next[id] = item;
          continue;
        }
        const rate = rateForType(item, buyerType);
        if (Number(item.rate) === rate) next[id] = item;
        else {
          changed = true;
          next[id] = { ...item, rate };
        }
      }
      return changed ? next : current;
    });
  }, [sell, buyerType]);

  const products = useInfiniteQuery({
    queryKey: ["telekhata-products", till.id, debounced],
    initialPageParam: 1,
    staleTime: 0,
    queryFn: async ({ pageParam }) => {
      const qs = new URLSearchParams({ q: debounced, showroomId: till.id, page: String(pageParam) });
      const res = await fetch(`/api/telekhata/products?${qs}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json;
    },
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
  const list = useMemo(() => products.data?.pages.flatMap((page) => page.data) || [], [products.data]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || step !== "products") return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && products.hasNextPage && !products.isFetchingNextPage) products.fetchNextPage();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [products, step]);

  const items = Object.values(picked);
  const subtotal = items.reduce((sum, item) => sum + num(item.qty) * num(item.rate), 0);
  const discountValue = discountOn ? Math.min(subtotal, num(discount)) : 0;
  const deliveryValue = deliveryOn ? num(delivery) : 0;
  const grand = Math.max(0, subtotal - discountValue + deliveryValue);

  // the account the money goes to / comes from: the picked one, else the shop's Cash
  const payAccounts = accounts.filter((account) => account.isActive !== false && account.type !== "advance");
  const chosenAccount =
    method === "baki" ? null : payAccounts.find((account) => account._id === accountId) || payAccounts.find((account) => account.type === "cash") || null;
  const chosenId = chosenAccount?._id || "";

  const paying = method === "baki" ? 0 : cashTouched ? Math.min(grand, num(cash)) : grand;
  const due = Math.max(0, grand - paying);

  const toggle = (product) =>
    setPicked((current) => {
      const next = { ...current };
      if (next[product.variantId]) delete next[product.variantId];
      else next[product.variantId] = { ...product, qty: 1, rate: askRate(product), rateEdited: false, expire: "", imeis: "" };
      return next;
    });

  const patch = (id, change) => setPicked((current) => ({ ...current, [id]: { ...current[id], ...change } }));

  const goCart = () => {
    if (!items.length) return showToast("error", "আগে পণ্য বাছুন");
    setStep("cart");
  };

  const goPay = () => {
    if (items.some((item) => !(num(item.qty) >= 1))) return showToast("error", "পরিমাণ কমপক্ষে ১ হতে হবে");
    setCashTouched(false);
    setCash("");
    setStep("pay");
  };

  const shop = showrooms.find((s) => String(s._id) === String(till.id));

  // Becha: saved as a normal POS sale of the selected showroom
  const sellNow = async () => {
    if (due > 0 && !supplier?.phone) return showToast("error", "বাকিতে বিক্রির জন্য কাস্টমার বাছুন");

    setSaving(true);
    try {
      const orderItems = items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.name,
        image: item.image || "",
        color: "",
        size: "",
        qty: num(item.qty),
        price: num(item.rate),
        subtotal: num(item.qty) * num(item.rate),
        imeis: String(item.imeis || "")
          .split(/[\s,]+/)
          .filter(Boolean),
      }));
      const payType = ["bkash", "nagad"].includes(method) ? "Mobile Banking" : method === "card" ? "Card" : ["bank", "cheque"].includes(method) ? "Bank" : "Cash";

      const res = await fetch("/api/showroom-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showroomId: till.id,
          soldFrom: till.id === "warehouse" ? "WAREHOUSE" : "SHOWROOM",
          orderType: "pos",
          customerId: supplier?._id || "",
          customerName: supplier?.name || "Walk-in Customer",
          phone: supplier?.phone || "",
          address: "",
          customerType: supplier?.type || "retail",
          saleDate: new Date(date).toISOString(),
          subTotal: subtotal,
          discount: discountValue,
          vat: 0,
          // delivery sits inside the total the ledger already reads; sending it
          // again as deliveryCharge would count it twice
          total: grand,
          payments: [{ type: payType, option: chosenAccount?.name || "", accountId: chosenId, amount: paying }],
          deliveryCharge: 0,
          remark: note,
          soldBy: "টেলিখাতা",
          items: orderItems,
          newItems: orderItems,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      const result = {
        number: json.order?.orderNumber || "",
        at: new Date(),
        supplier: supplier || { name: "ওয়াক-ইন কাস্টমার", phone: "" },
        items,
        subtotal,
        discount: discountValue,
        delivery: deliveryValue,
        grand,
        paid: paying,
        due,
        shop: till.name,
        phone: shop?.phone || "",
        address: shop?.address || "",
      };
      setReceipt(result);
      setStep("receipt");
      queryClient.invalidateQueries({ queryKey: ["telekhata-products"] });
      queryClient.invalidateQueries({ queryKey: ["telekhata-summary"] });
      if (sms && supplier?.phone) {
        window.open(`sms:${supplier.phone}?body=${encodeURIComponent(receiptText(result))}`, "_self");
      }
    } catch (error) {
      showToast("error", error.message || "বিক্রি সেভ হয়নি");
    } finally {
      setSaving(false);
    }
  };

  const confirm = async () => {
    if (sell) return sellNow();
    if (!supplier) return showToast("error", "সাপ্লায়ার বাছুন");

    setSaving(true);
    let attachment;
    let uploadedId = null;
    try {
      if (photoFile) {
        const body = new FormData();
        body.append("file", photoFile);
        const up = await (await fetch("/api/media/upload", { method: "POST", body })).json();
        if (!up?.success || !up.media?.secure_url) throw new Error(up?.message || "রিসিপ্টের ছবি আপলোড হয়নি");
        uploadedId = up.media._id;
        attachment = { url: up.media.secure_url, publicId: up.media.public_id || "" };
      }

      const res = await fetch("/api/purchase/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: supplier._id,
          showroomId: till.id,
          purchaseDate: date,
          referenceNo: challan,
          note: [batch && `ব্যাচ: ${batch}`, note].filter(Boolean).join(" · "),
          discountType: "amount",
          discountValue,
          shippingCost: deliveryValue,
          attachment,
          items: items.map((item) => ({
            variantId: item.variantId,
            quantity: num(item.qty),
            unitPrice: num(item.rate),
            expireDate: item.expire || null,
            imeis: String(item.imeis || "")
              .split(/[\s,]+/)
              .filter(Boolean),
          })),
          payments: paying > 0 ? [{ amount: paying, method: method === "baki" ? "cash" : method, accountId: chosenId }] : [],
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      const result = {
        number: json.data?.purchaseNumber || "",
        at: new Date(),
        supplier,
        items,
        subtotal,
        discount: discountValue,
        delivery: deliveryValue,
        grand,
        paid: paying,
        due,
        shop: till.name,
        phone: shop?.phone || "",
        address: shop?.address || "",
      };
      setReceipt(result);
      setStep("receipt");
      queryClient.invalidateQueries({ queryKey: ["telekhata-products"] });
      queryClient.invalidateQueries({ queryKey: ["telekhata-summary"] });
      if (sms && supplier.phone) {
        window.open(`sms:${supplier.phone}?body=${encodeURIComponent(receiptText(result))}`, "_self");
      }
    } catch (error) {
      if (uploadedId) {
        fetch("/api/media/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [uploadedId], deleteType: "PD" }),
        }).catch(() => {});
      }
      showToast("error", error.message || "কেনা সেভ হয়নি");
    } finally {
      setSaving(false);
    }
  };

  const stamp = (d) => {
    const x = new Date(d);
    const p = (n) => String(n).padStart(2, "0");
    const month = x.toLocaleString("en-US", { month: "short" });
    return `${x.getFullYear()}-${month}-${p(x.getDate())} ${p(x.getHours())}:${p(x.getMinutes())}`;
  };

  const receiptText = (r) =>
    [
      r.shop,
      `রিসিপ্ট # ${r.number}`,
      stamp(r.at),
      `${r.supplier.name} ${r.supplier.phone}`,
      "",
      ...r.items.map((item, index) => `${bnNumber(index + 1)}. ${item.name} ${bnNumber(item.qty)} x ${bnNumber(item.rate)} = ${bnNumber(num(item.qty) * num(item.rate))}`),
      "",
      `মোট: ${bnNumber(r.grand)} ৳`,
      `পরিশোধ: ${bnNumber(r.paid)} ৳`,
      `বাকি: ${bnNumber(r.due)} ৳`,
    ].join(String.fromCharCode(10));

  const printReceipt = (r) => {
    const rows = r.items
      .map((item, index) => `<tr><td>${bnNumber(index + 1)}. ${item.name}</td><td>${bnNumber(item.rate)} ৳</td><td>${bnNumber(item.qty)}</td><td>${bnNumber(num(item.qty) * num(item.rate))} ৳</td></tr>`)
      .join("");
    const win = window.open("", "_blank", "width=420,height=640");
    if (!win) return showToast("error", "প্রিন্টের জন্য পপ-আপ চালু করুন");
    win.document.write(
      `<html><head><meta charset="utf-8"><title>রিসিপ্ট ${r.number}</title><style>body{font-family:Arial;font-size:13px;padding:12px}table{width:100%;border-collapse:collapse}td,th{padding:3px 2px;text-align:right}td:first-child,th:first-child{text-align:left}hr{border:0;border-top:1px dashed #999}</style></head><body><h3 style="text-align:center;margin:0">${r.shop}</h3><p style="text-align:center">${r.phone}<br>${r.address}</p><p><b>রিসিপ্ট # ${r.number}</b><br>${stamp(r.at)}</p><p>নাম : ${r.supplier.name}<br>মোবাইল : ${r.supplier.phone}</p><table><tr><th>পণ্যের নাম</th><th>দাম</th><th>পরিমান</th><th>মোট দাম</th></tr>${rows}</table><hr><p style="text-align:right">মোট: ${bnNumber(r.subtotal)} ৳<br>ডিসকাউন্ট: ${bnNumber(r.discount)} ৳<br>ডেলিভারি চার্জ: ${bnNumber(r.delivery)} ৳<br><b>সর্বমোট: ${bnNumber(r.grand)} ৳</b><br>পরিশোধ: ${bnNumber(r.paid)} ৳<br>বাকি: ${bnNumber(r.due)} ৳</p></body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  };

  const shareReceipt = async (r) => {
    const text = receiptText(r);
    try {
      if (navigator.share) await navigator.share({ title: `রিসিপ্ট ${r.number}`, text });
      else {
        await navigator.clipboard.writeText(text);
        showToast("success", "রিসিপ্ট কপি হয়েছে");
      }
    } catch {
      // share sheet closed
    }
  };

  const back = () => {
    if (step === "pay") setStep("cart");
    else if (step === "cart") setStep("products");
    else router.push(ADMIN_TELEKHATA);
  };

  const barIcons = (
    <>
      <HelpIcon />
      <DotsIcon />
    </>
  );

  // ---------------------------------------------------------------- products
  if (step === "products") {
    return (
      <Screen className="pb-2">
        <AppBar title={sell ? "বেচা" : "কেনা"} onBack={back}>
          {barIcons}
        </AppBar>
        <div className="space-y-3 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-14 min-w-0 flex-1 items-center gap-2 rounded-lg border-2 border-[#1b56d8] bg-white px-3">
              <Search className="size-6 shrink-0 text-[#555]" />
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="পণ্য খোঁজ করুন"
                className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
              />
              <span className="h-7 w-px bg-[#555]" />
              <span className="flex shrink-0 items-center gap-1 text-[16px]">
                <Funnel className="size-5" /> ফিল্টার
              </span>
            </div>
            <button type="button" onClick={() => searchRef.current?.focus()} aria-label="বারকোড স্ক্যান" className="text-[#1b56d8]">
              <svg viewBox="0 0 40 40" className="size-10" fill="none" stroke="#1b56d8" strokeWidth="2.6" strokeLinecap="round">
                <path d="M6 14V8a2 2 0 0 1 2-2h6M26 6h6a2 2 0 0 1 2 2v6M34 26v6a2 2 0 0 1-2 2h-6M14 34H8a2 2 0 0 1-2-2v-6" />
                <path d="M12 12v16M17 12v16M22 12v16M27 12v16" strokeWidth="2.2" />
              </svg>
            </button>
          </div>

          {products.isLoading && <p className="py-10 text-center text-sm text-[#777]">লোড হচ্ছে...</p>}
          {products.isError && (
            <button type="button" onClick={() => products.refetch()} className="w-full py-10 text-center text-sm text-[#1b56d8] underline">
              লোড হয়নি। আবার চেষ্টা করুন
            </button>
          )}
          {!products.isLoading && !products.isError && list.length === 0 && <p className="py-10 text-center text-sm text-[#777]">কোনো পণ্য পাওয়া যায়নি</p>}

          <div className="space-y-3">
            {list.map((product) => {
              const on = !!picked[product.variantId];
              return (
                <PickCard
                  key={product.variantId}
                  on={on}
                  qty={picked[product.variantId]?.qty}
                  onToggle={() => toggle(product)}
                  onStep={(step) => {
                    const qty = num(picked[product.variantId]?.qty) + step;
                    if (qty < 1) toggle(product);
                    else patch(product.variantId, { qty });
                  }}
                  image={<ProductImage product={product} />}
                >
                  <p className="m-0 text-[17px] font-bold leading-snug text-[#111]">
                    {product.name}
                    {product.variantLabel ? ` · ${product.variantLabel}` : ""}
                  </p>
                  <div className={`mt-1 grid gap-1 text-[14px] ${sell ? "grid-cols-2" : "grid-cols-3"}`}>
                    <div>
                      <p className="m-0 text-[#666]">স্টক সংখ্যা</p>
                      <p className="m-0 font-bold">{bnNumber(product.stock)}</p>
                    </div>
                    <div className={sell ? "text-right" : "text-center"}>
                      <p className="m-0 text-[#666]">{sell ? RATE_LABEL[buyerType] : "বিক্রয় মূল্য"}</p>
                      <p className="m-0 font-bold">{money(sell ? askRate(product) : product.sellPrice)}</p>
                    </div>
                    {!sell && (
                      <div className="text-right">
                        <p className="m-0 text-[#666]">ক্রয় মূল্য</p>
                        <p className="m-0 font-bold">{money(product.costPrice)}</p>
                      </div>
                    )}
                  </div>
                </PickCard>
              );
            })}
            <div ref={sentinel} className="h-6" />
            {products.isFetchingNextPage && <p className="text-center text-xs text-[#777]">লোড হচ্ছে...</p>}
          </div>
        </div>

        <div className={`sticky bottom-0 z-30 flex items-center justify-between gap-3 px-4 py-4 ${BLUE_BTN}`}>
          <span className="flex items-center gap-3 text-[17px]">
            <ShoppingBag className="size-7" strokeWidth={1.8} /> পণ্য নির্বাচন করেছেনঃ {bnNumber(items.length)}
          </span>
          <button type="button" onClick={goCart} className="flex h-12 items-center gap-3 rounded-lg bg-white px-5 text-[18px] text-[#1b56d8] shadow">
            {sell ? "পণ্য বেচুন" : "পণ্য কিনুন"} <span>›</span>
          </button>
        </div>
      </Screen>
    );
  }

  // -------------------------------------------------------------------- cart
  if (step === "cart") {
    const row = editRow ? picked[editRow.id] : null;

    return (
      <Screen className="pb-4">
        <AppBar title="কার্ট" onBack={back} />
        <div className="space-y-3 p-3">
          {!sell && (
          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1 text-[16px]">
              ব্যাচ
              <input value={batch} onChange={(event) => setBatch(event.target.value)} placeholder="ব্যাচ" className="block h-14 w-full rounded-lg border border-[#bbb] bg-white px-3 text-[16px] outline-none focus:border-[#1b56d8]" />
            </label>
            <label className="space-y-1 text-[16px]">
              চালান নং
              <input value={challan} onChange={(event) => setChallan(event.target.value)} placeholder="চালান নং" className="block h-14 w-full rounded-lg border border-[#bbb] bg-white px-3 text-[16px] outline-none focus:border-[#1b56d8]" />
            </label>
          </div>
          )}

          <div className="grid grid-cols-[88px_1fr_1fr_1fr] border-b border-[#bbb] pb-2 text-center text-[16px]">
            <span className="text-left">পণ্য</span>
            <span>পরিমান</span>
            <span>দর</span>
            <span>মোট</span>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.variantId} className="rounded-xl bg-[#efefef] p-3 shadow-[0_2px_3px_rgba(0,0,0,0.12)]">
                <div className="grid grid-cols-[88px_1fr] gap-2">
                  <div />
                  <div className={`grid gap-2 ${sell ? "grid-cols-2" : "grid-cols-3"}`}>
                    {[
                      ["imei", "বারকোড", Barcode],
                      ["expire", "মেয়াদ", CalendarDays],
                      ["edit", "এডিট", SquarePen],
                    ].filter(([kind]) => !(sell && kind === "expire")).map(([kind, label, Icon]) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => setEditRow({ id: item.variantId, kind })}
                        className="flex h-10 items-center justify-center gap-1 rounded-md bg-white text-[14px] text-[#1b56d8] shadow-sm"
                      >
                        <Icon className="size-5 text-[#222]" /> {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-[88px_1fr] items-center gap-2 pt-1">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <ProductImage product={item} />
                    <span className="text-[13px] leading-tight">{item.name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={item.qty}
                      onChange={(event) => patch(item.variantId, { qty: event.target.value })}
                      className="h-14 w-full rounded-md bg-white text-center text-[17px] shadow-sm outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={item.rate}
                      onChange={(event) => patch(item.variantId, { rate: event.target.value })}
                      className="h-14 w-full rounded-md bg-white text-center text-[17px] shadow-sm outline-none"
                    />
                    <span className="flex h-14 items-center justify-center rounded-md bg-white text-[17px] shadow-sm">{bnNumber(num(item.qty) * num(item.rate))}</span>
                  </div>
                </div>
                {(item.expire || item.imeis) && (
                  <p className="m-0 mt-1 text-[12px] text-[#555]">
                    {item.expire ? `মেয়াদ: ${item.expire}  ` : ""}
                    {item.imeis ? `বারকোড/IMEI: ${String(item.imeis).split(/[\s,]+/).filter(Boolean).length}টি` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-[19px]">
              <span>মোট</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#dedede] px-4 py-4 text-[18px]">
              <span>ডিস্কাউন্ট</span>
              <Switch on={discountOn} onChange={setDiscountOn} />
            </div>
            {discountOn && (
              <input type="number" min="0" inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder="ডিসকাউন্টের পরিমাণ" className="block h-14 w-full rounded-lg border border-[#bbb] px-3 text-[16px]" />
            )}
            <div className="flex items-center justify-between rounded-lg bg-[#dedede] px-4 py-4 text-[18px]">
              <span>ডেলিভারী চার্জ</span>
              <Switch on={deliveryOn} onChange={setDeliveryOn} />
            </div>
            {deliveryOn && (
              <input type="number" min="0" inputMode="decimal" value={delivery} onChange={(event) => setDelivery(event.target.value)} placeholder="ডেলিভারী চার্জ" className="block h-14 w-full rounded-lg border border-[#bbb] px-3 text-[16px]" />
            )}
            <hr className="border-t-2 border-[#ccc]" />
            <div className="flex items-center justify-between text-[19px]">
              <span>সর্বমোট</span>
              <span>{money(grand)}</span>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-30 bg-white p-3 dark:bg-background">
          <button type="button" onClick={goPay} className={`flex h-14 w-full items-center justify-center gap-3 rounded-xl text-[19px] shadow-md ${BLUE_BTN}`}>
            এগিয়ে যান <span className="absolute right-6 text-[22px]">›</span>
          </button>
        </div>

        <Dialog open={!!editRow} onOpenChange={(next) => !next && setEditRow(null)}>
          <DialogContent className="gap-0 p-0 sm:max-w-md">
            <DialogHeader className="border-b bg-[#f7f7f7] px-5 py-4">
              <DialogTitle className="text-[17px]">
                {row?.name} · {editRow?.kind === "imei" ? "বারকোড / IMEI" : editRow?.kind === "expire" ? "মেয়াদ" : "এডিট"}
              </DialogTitle>
            </DialogHeader>
            {row && (
              <div className="space-y-3 px-5 py-4 text-[15px]">
                {editRow.kind === "imei" && (
                  <>
                    <p className="m-0 text-[13px] text-[#666]">প্রতিটি বারকোড/IMEI নতুন লাইনে লিখুন (সর্বোচ্চ {bnNumber(num(row.qty))}টি)</p>
                    <textarea
                      rows={5}
                      value={row.imeis}
                      onChange={(event) => patch(row.variantId, { imeis: event.target.value })}
                      className="block w-full rounded-lg border p-3 text-[15px] outline-none focus:border-[#1b56d8]"
                    />
                  </>
                )}
                {editRow.kind === "expire" && (
                  <input type="date" value={row.expire} onChange={(event) => patch(row.variantId, { expire: event.target.value })} className="block h-14 w-full rounded-lg border px-3 text-[16px]" />
                )}
                {editRow.kind === "edit" && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1 text-[14px]">
                      পরিমান
                      <input type="number" min="1" value={row.qty} onChange={(event) => patch(row.variantId, { qty: event.target.value })} className="block h-12 w-full rounded-lg border px-3 text-[16px]" />
                    </label>
                    <label className="space-y-1 text-[14px]">
                      দর
                      <input type="number" min="0" step="0.01" value={row.rate} onChange={(event) => patch(row.variantId, { rate: event.target.value, rateEdited: true })} className="block h-12 w-full rounded-lg border px-3 text-[16px]" />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        toggle(row);
                        setEditRow(null);
                      }}
                      className="col-span-2 h-11 rounded-lg border border-[#d9453c] text-[15px] text-[#d9453c]"
                    >
                      কার্ট থেকে বাদ দিন
                    </button>
                  </div>
                )}
                <button type="button" onClick={() => setEditRow(null)} className={`h-12 w-full rounded-lg text-[16px] ${BLUE_BTN}`}>
                  ঠিক আছে
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Screen>
    );
  }

  // ----------------------------------------------------------------- payment
  if (step === "pay") {
    return (
      <Screen className="pb-4">
        <AppBar title={sell ? "বেচা" : "কেনা"} onBack={back} />
        <div className="space-y-4 p-4">
          <div className="text-center">
            <p className="m-0 text-[18px]">{sell ? "মোট প্রাপ্য" : "মোট প্রদেয়"}</p>
            <p className="m-0 mt-1 text-[26px] font-bold text-[#1b56d8]">{money(grand)}</p>
          </div>

          <div className="space-y-2">
            <p className="m-0 text-[17px] font-medium text-[#2a4aa0]">{sell ? "ক্যাশ পেয়েছি" : "ক্যাশ দিয়েছি"}</p>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              disabled={method === "baki"}
              value={method === "baki" ? "0" : cashTouched ? cash : String(grand)}
              onChange={(event) => {
                setCashTouched(true);
                setCash(event.target.value);
              }}
              className="block h-16 w-full rounded-lg border border-[#bbb] bg-white px-4 text-[18px] text-[#2a2a60] outline-none focus:border-[#1b56d8] disabled:opacity-60"
            />
            {due > 0 && <p className="m-0 text-[14px] text-[#d9453c]">{sell ? "কাস্টমারের কাছে বাকি" : "সাপ্লায়ারকে বাকি"}: {money(due)}</p>}
          </div>

          <div className="space-y-3 rounded-xl bg-[#efefef] p-4">
            <p className="m-0 pt-1 text-[18px]">{sell ? "কাস্টমার" : "সাপ্লায়ার"}</p>
            <button
              type="button"
              onClick={() => setSupplierOpen(true)}
              className="flex h-16 w-full items-center justify-between rounded-lg border border-[#bbb] bg-white px-4 text-[18px]"
            >
              <span>{supplier ? supplier.name : sell ? "--ওয়াক-ইন কাস্টমার--" : "--সিলেক্ট--"}</span>
              <span className="text-[22px] leading-none">⌄</span>
            </button>
            {sell && supplier && buyerType !== "retail" && (
              <p className="m-0 text-[14px] text-[#1b56d8]">{RATE_LABEL[buyerType]} বসেছে</p>
            )}
            <div className={`grid gap-3 ${sell ? "grid-cols-1" : "grid-cols-[1fr_1.1fr]"}`}>
              <input ref={photoRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => setPhotoFile(event.target.files?.[0] || null)} />
              {!sell && (
                <button type="button" onClick={() => photoRef.current?.click()} className="flex h-14 items-center justify-center gap-2 truncate rounded-lg border bg-white px-2 text-[15px]">
                  <Camera className="size-7 shrink-0 text-[#333]" strokeWidth={1.6} />
                  <span className="truncate">{photoFile ? photoFile.name : "রিসিপ্টের ছবি"}</span>
                </button>
              )}
              <label className="relative flex h-14 cursor-pointer items-center justify-center gap-3 rounded-lg border bg-white px-2 text-[16px] font-medium uppercase">
                <CalendarDays className="size-7 text-[#333]" strokeWidth={1.6} />
                {new Date(date).toLocaleDateString("bn-BD", { day: "2-digit" })} {new Date(date).toLocaleDateString("en-US", { month: "long" })}
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="তারিখ" />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-[#efefef] px-4 py-3.5 text-[17px]">
            <span className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-md border-2 border-[#333] bg-white text-[10px] font-bold text-[#f5a623]">SMS</span>
              এস এম এস এ রিসিপ্ট পাঠান
            </span>
            <Switch on={sms} onChange={setSms} />
          </div>

          <div className="space-y-2">
            <p className="m-0 text-[21px] font-bold">মূল্য পরিশোধ পদ্ধতি</p>
            <p className="m-0 text-[15px] text-[#777]">আপনার মূল্য পরিশোধের ধরণ নির্বাচন করুন</p>
            {[
              ...payAccounts.map((account) => ({ key: account._id, label: account.name, sub: money(account.balance), Icon: ICONS[account.type] || FcMoneyTransfer, account })),
              { key: "baki", label: "বাকি রাখুন", sub: "", Icon: FcCalendar, account: null },
            ].map(({ key, label, sub, Icon, account }) => {
              const on = key === "baki" ? method === "baki" : method !== "baki" && chosenId === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (account) {
                      setMethod(methodOf(account));
                      setAccountId(account._id);
                    } else {
                      setMethod("baki");
                      setAccountId("");
                    }
                  }}
                  className={`flex w-full items-center gap-4 rounded-xl border-2 px-4 py-4 text-left text-[19px] shadow-sm transition-all duration-200 ${on ? "border-[#1b56d8] bg-[#eaf1ff]" : "border-transparent bg-[#efefef]"}`}
                >
                  <Icon className="size-9 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{label}</span>
                    {sub && <span className="block text-[13px] text-[#777]">ব্যালেন্স: {sub}</span>}
                  </span>
                  <span className={`flex size-7 items-center justify-center rounded-full border-2 transition-colors ${on ? "border-[#1b56d8]" : "border-[#111]"}`}>
                    {on && <span className="size-4 rounded-full bg-[#1b56d8]" />}
                  </span>
                </button>
              );
            })}
          </div>

          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="মন্তব্য লিখুন" maxLength={300} className="block h-16 w-full rounded-lg border border-[#bbb] bg-white px-4 text-[17px] outline-none focus:border-[#1b56d8]" />
        </div>

        <div className="sticky bottom-0 z-30 bg-white p-3 dark:bg-background">
          <button type="button" disabled={saving} onClick={confirm} className={`h-14 w-full rounded-xl text-[19px] shadow-md disabled:opacity-60 ${BLUE_BTN}`}>
            {saving ? "সেভ হচ্ছে..." : "পেমেন্ট কনফার্ম করুন"}
          </button>
        </div>

        <SupplierPicker
          sell={sell}
          open={supplierOpen}
          onClose={() => setSupplierOpen(false)}
          onPick={(picked) => {
            setSupplier(picked);
            setSupplierOpen(false);
          }}
        />
      </Screen>
    );
  }

  // ----------------------------------------------------------------- receipt
  return (
    <Screen className="pb-4">
      <div className="space-y-3 px-4 pt-5">
        <p className="m-0 text-center text-[20px]">{sell ? "বিক্রি করেছেন" : "কিনেছেন"} {money(receipt?.grand)} মূল্যের পণ্য</p>

        <div className="pt-8 text-center">
          <h2 className="m-0 text-[23px] font-normal">{receipt?.shop}</h2>
          {receipt?.phone && <p className="m-0 mt-1 text-[15px] text-[#444]">{receipt.phone}</p>}
          {receipt?.address && <p className="m-0 text-[15px] text-[#444]">{receipt.address}</p>}
        </div>

        <div className="pt-2">
          <p className="m-0 text-[21px] font-bold">রিসিপ্ট # {receipt?.number}</p>
          <p className="m-0 text-[16px] font-bold">{receipt ? stamp(receipt.at) : ""}</p>
        </div>

        <div className="pt-3 text-[16px] font-bold leading-snug">
          <p className="m-0">নাম : {receipt?.supplier?.name}</p>
          <p className="m-0">মোবাইল : +88{receipt?.supplier?.phone}</p>
        </div>

        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="border-y border-dashed border-[#333]">
              <th className="py-1.5 text-left font-normal">পণ্যের নাম</th>
              <th className="text-right font-normal">দাম</th>
              <th className="text-right font-normal">পরিমান</th>
              <th className="text-right font-normal">মোট দাম</th>
            </tr>
          </thead>
          <tbody>
            {receipt?.items.map((item, index) => (
              <tr key={item.variantId} className="border-b border-[#ddd]">
                <td className="py-2">
                  {bnNumber(index + 1)}. {item.name}
                </td>
                <td className="text-right">{money(item.rate)}</td>
                <td className="text-right">{bnNumber(item.qty)}</td>
                <td className="text-right">{money(num(item.qty) * num(item.rate))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-1 pt-2 text-right text-[15px]">
          <p className="m-0">
            মোট: <b className="ml-8 inline-block min-w-20">{money(receipt?.subtotal)}</b>
          </p>
          <p className="m-0">
            (+) ভ্যাট পরিমাণ: <b className="ml-8 inline-block min-w-20">0.0</b>
          </p>
          <p className="m-0">
            (-) ডিসকাউন্ট: <b className="ml-8 inline-block min-w-20">{receipt?.discount ? money(receipt.discount) : "0%"}</b>
          </p>
          <p className="m-0">
            ডেলিভারি চার্জ: <b className="ml-8 inline-block min-w-20">{money(receipt?.delivery)}</b>
          </p>
          <hr className="border-t border-dashed border-[#333]" />
          <p className="m-0 text-[16px]">
            মোট প্রদেয়: <b className="ml-8 inline-block min-w-20">{money(receipt?.grand)}</b>
          </p>
          <p className="m-0">
            পরিশোধ: <b className="ml-8 inline-block min-w-20">{money(receipt?.paid)}</b>
          </p>
          <p className="m-0 text-[#d9453c]">
            বাকি: <b className="ml-8 inline-block min-w-20">{money(receipt?.due)}</b>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-6">
          <button type="button" onClick={() => printReceipt(receipt)} className="flex flex-col items-center gap-2 text-[17px]">
            <FcPrint className="size-14" />
            রিসিপ্ট প্রিন্ট করুন
          </button>
          <button type="button" onClick={() => shareReceipt(receipt)} className="flex flex-col items-center gap-2 text-[17px]">
            <ShareIcon />
            রিসিপ্ট শেয়ার
          </button>
        </div>

        <Link href={ADMIN_TELEKHATA} className={`mt-4 flex h-14 w-full items-center justify-center rounded-xl text-[18px] shadow-md ${BLUE_BTN}`}>
          সম্পন্ন করুন
        </Link>
      </div>
    </Screen>
  );
}

// "Select Supplier" popup: search, pick, or add a new supplier
function SupplierPicker({ open, onClose, onPick, sell }) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setSearch("");
      setAdding(false);
      setForm({ name: "", phone: "" });
    }
  }, [open]);

  const { data, isLoading } = useQuery({
    queryKey: ["telekhata-suppliers", sell ? "customer" : "supplier", search.trim()],
    enabled: open,
    staleTime: 0,
    queryFn: async () => {
      const qs = new URLSearchParams({ type: sell ? "customer" : "supplier", search: search.trim() });
      const json = await (await fetch(`/api/telekhata/parties?${qs}`)).json();
      if (!json.success) throw new Error(json.message);
      return json.parties;
    },
  });

  const addSupplier = async () => {
    if (!form.name.trim() || !form.phone.trim()) return showToast("error", "নাম ও মোবাইল লাগবে");
    if (sell) return onPick({ _id: "", name: form.name.trim(), phone: form.phone.trim() });
    setSaving(true);
    try {
      const res = await fetch("/api/supplier/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, phone: form.phone }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      const created = json.data || json.supplier;
      queryClient.invalidateQueries({ queryKey: ["telekhata-suppliers"] });
      onPick({ _id: String(created._id), name: created.name, phone: created.phone });
    } catch (error) {
      showToast("error", error.message || "সাপ্লায়ার যোগ হয়নি");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="px-6 pt-5">
          <DialogTitle className="text-[19px] font-medium text-[#777]">{sell ? "কাস্টমার বাছুন" : "Select Supplier"}</DialogTitle>
        </DialogHeader>

        {adding ? (
          <div className="space-y-3 p-5">
            <input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={sell ? "কাস্টমারের নাম" : "সাপ্লায়ারের নাম"} className="block h-14 w-full rounded-lg border border-[#bbb] px-3 text-[16px]" />
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="মোবাইল" inputMode="tel" className="block h-14 w-full rounded-lg border border-[#bbb] px-3 text-[16px]" />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button type="button" onClick={() => setAdding(false)} className="h-14 rounded-lg border border-[#111] text-[16px] font-medium">
                ফিরে যান
              </button>
              <button type="button" disabled={saving} onClick={addSupplier} className={`h-14 rounded-lg text-[16px] font-medium disabled:opacity-60 ${BLUE_BTN}`}>
                {saving ? "সেভ হচ্ছে..." : sell ? "কাস্টমার যুক্ত করুন" : "সাপ্লায়ার যুক্ত করুন"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 pb-2">
              <label className="flex h-14 items-center gap-3 rounded-lg border border-[#bbb] px-4">
                <Search className="size-6 text-[#555]" />
                <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="খোঁজ করুন" className="min-w-0 flex-1 bg-transparent text-[17px] outline-none" />
              </label>
            </div>
            <div className="max-h-[50vh] divide-y overflow-y-auto px-6">
              {isLoading && <p className="py-6 text-center text-sm text-[#777]">লোড হচ্ছে...</p>}
              {!isLoading && (data || []).length === 0 && <p className="py-6 text-center text-sm text-[#777]">কোনো সাপ্লায়ার নেই</p>}
              {(data || []).map((party) => (
                <button key={party._id} type="button" onClick={() => onPick(party)} className="block w-full py-3.5 text-left text-[17px] leading-snug">
                  {party.name} (+88{party.phone})
                  {sell && normalizeCustomerType(party.type) !== "retail" && (
                    <span className="mt-0.5 block text-[13px] font-medium text-[#1b56d8]">{CUSTOMER_TYPES[normalizeCustomerType(party.type)].short}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 p-5">
              <button type="button" onClick={onClose} className="h-14 rounded-lg border border-[#111] text-[16px] font-medium">
                বন্ধ করুন
              </button>
              <button type="button" onClick={() => setAdding(true)} className={`h-14 rounded-lg text-[16px] font-medium ${BLUE_BTN}`}>
                {sell ? "কাস্টমার যুক্ত করুন" : "সাপ্লায়ার যুক্ত করুন"}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
