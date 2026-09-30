"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { ClipboardList, List, Minus, Plus, Trash2, X } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { useOpeningStockTill } from "@/lib/posProducts";
import { ADMIN_PURCHASE_SHOW, ADMIN_PURCHASE_VIEW } from "@/Route/Adminpannelroute";
import { ListCard, btn, filterInput as inputClass, tdClass, thClass, theadClass, totalRowClass } from "@/components/ui/Application/Admin/listKit";
import { PAYMENT_METHODS, money } from "@/components/ui/Application/Admin/supplier/supplierKit";
import {
  AttachmentInput,
  Field,
  ProductSearch,
  RATES,
  SupplierPicker,
  cell,
  num,
  today,
  useSuppliers,
} from "@/components/ui/Application/Admin/purchase/purchaseKit";
import PurchasePosPicker from "@/components/ui/Application/Admin/purchase/PurchasePosPicker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const round2 = (value) => Math.round(num(value) * 100) / 100;

// what a row costs after its discount, and per unit once free units share it
const lineTotal = (line) => Math.max(0, num(line.quantity) * num(line.unitPrice) - num(line.discount));
const unitCost = (line) => {
  const units = num(line.quantity) + num(line.extraQty);
  return units ? lineTotal(line) / units : 0;
};

const newPayment = () => ({ method: "cash", amount: "", reference: "" });

export default function AddPurchasePage() {
  return (
    <Suspense fallback={<div className="h-[420px] animate-pulse rounded-[8px] bg-white dark:bg-card" />}>
      <AddPurchase />
    </Suspense>
  );
}

/**
 * "Purchase Product", laid out like the 360 purchase screen: supplier and
 * header fields, product lines with extra (free) quantity, line discount
 * and expire date, then totals and split payments.
 *
 * Every line also shows what each buyer type (buyer, dealer, sub dealer,
 * wholesaler) pays for it and the margin left at this cost, so a price rise
 * that eats the dealer margin is seen before the goods are taken in.
 *
 * Opened with ?po=<id> it receives that purchase order: supplier and lines
 * are copied in, and the order's new sale rates go onto the products when
 * the goods are taken into stock.
 */
function AddPurchase() {
  const router = useRouter();
  const params = useSearchParams();
  const [suppliers, reloadSuppliers] = useSuppliers();
  const till = useOpeningStockTill();

  const [head, setHead] = useState({
    supplierId: "",
    purchaseNumber: "",
    referenceNo: "",
    purchaseDate: today(),
    dueDate: "",
    status: "received",
    note: "",
  });
  const [attachment, setAttachment] = useState(null);
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState({ type: "amount", value: "" });
  const [shippingCost, setShippingCost] = useState("");
  const [payments, setPayments] = useState([newPayment()]);
  const [stockInTo, setStockInTo] = useState("");

  const [imeiRow, setImeiRow] = useState(null);
  const [imeiText, setImeiText] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(params.get("po") ? "form" : "pick");

  useEffect(() => {
    axios
      .get("/api/purchase/next-number?kind=purchase")
      .then(({ data }) => data.success && setHead((h) => ({ ...h, purchaseNumber: h.purchaseNumber || data.number })))
      .catch(() => {});

  }, []);

  useEffect(() => {
    setStockInTo(till.name);
  }, [till.name]);

  const tillSeen = useRef(till.id);
  useEffect(() => {
    if (tillSeen.current === till.id) return;
    tillSeen.current = till.id;
    if (params.get("po")) return;
    setItems([]);
    setStep("pick");
  }, [till.id, params]);

  // "Receive" on a purchase order opens this screen with ?po=<id>
  useEffect(() => {
    const poId = params.get("po");
    if (!poId) return;

    axios
      .get(`/api/purchase-orders/${poId}`)
      .then(({ data }) => {
        if (!data.success) return showToast("error", data.message || "Purchase order not found");
        const po = data.data;
        if (po.status !== "pending") return showToast("error", `${po.orderNumber} is already ${po.status}`);

        setOrder(po);
        setStep("form");
        setHead((h) => ({ ...h, supplierId: String(po.supplierId?._id || po.supplierId), referenceNo: po.orderNumber }));
        setItems(
          po.items.map((item) => ({
            variantId: String(item.variantId),
            productName: item.productName,
            variantLabel: item.variantLabel,
            barcode: item.barcode,
            stock: item.stockAtOrder,
            lastCost: item.prevPurchasePrice,
            // the rates the order will set, where it sets one
            rates: Object.fromEntries(
              RATES.map(([f]) => [f, num(item[f]) || num(item[`prev${f[0].toUpperCase()}${f.slice(1)}`])]),
            ),
            newRate: Object.fromEntries(RATES.map(([f]) => [f, num(item[f]) > 0])),
            quantity: String(item.quantity),
            extraQty: item.extraQty ? String(item.extraQty) : "",
            unitPrice: String(item.purchasePrice),
            discount: item.discount ? String(item.discount) : "",
            expireDate: "",
            imeis: [],
          })),
        );
      })
      .catch((error) => showToast("error", error.response?.data?.message || "Could not load the purchase order"));
  }, [params]);

  const addItem = (hit) =>
    setItems((current) => {
      const at = current.findIndex((item) => item.variantId === hit.variantId);
      if (at >= 0) return current.map((item, i) => (i === at ? { ...item, quantity: String(num(item.quantity) + 1) } : item));
      return [
        {
          ...hit,
          quantity: "1",
          extraQty: "",
          unitPrice: hit.lastCost ? String(hit.lastCost) : "",
          discount: "",
          expireDate: "",
          imeis: [],
        },
        ...current,
      ];
    });

  const updateItem = (index, patch) => setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const removeItem = (index) => setItems((current) => current.filter((_, i) => i !== index));

  const openImei = (index) => {
    setImeiRow(index);
    setImeiText(items[index].imeis.join("\n"));
  };

  const saveImeis = () => {
    const imeis = [...new Set(imeiText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean))];
    const row = items[imeiRow];
    const units = num(row.quantity) + num(row.extraQty);
    if (imeis.length > units) return showToast("error", `${imeis.length} IMEI for only ${units} unit(s). Raise the quantity first.`);
    updateItem(imeiRow, { imeis });
    setImeiRow(null);
  };

  const totals = useMemo(() => {
    const subtotal = round2(items.reduce((sum, item) => sum + lineTotal(item), 0));
    const itemCount = items.reduce((sum, item) => sum + num(item.quantity) + num(item.extraQty), 0);
    const discountAmount = Math.min(
      subtotal,
      round2(discount.type === "percent" ? (subtotal * num(discount.value)) / 100 : num(discount.value)),
    );
    const grand = round2(subtotal - discountAmount + num(shippingCost));
    const paid = round2(payments.reduce((sum, p) => sum + num(p.amount), 0));
    return { subtotal, itemCount, discountAmount, grand, paid, due: round2(grand - paid) };
  }, [items, discount, shippingCost, payments]);

  const lossLines = items.filter((item) => {
    const cost = unitCost(item);
    return cost > 0 && RATES.some(([f]) => item.rates?.[f] > 0 && item.rates[f] <= cost);
  });

  const setPayment = (index, patch) => setPayments((list) => list.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  const payFull = () => setPayments((list) => [{ ...list[0], amount: String(totals.grand) }, ...list.slice(1).map((p) => ({ ...p, amount: "" }))]);

  const save = async (event) => {
    event.preventDefault();

    if (!head.supplierId) return showToast("error", "Select a supplier");
    if (!items.length) return showToast("error", "Add at least one product");
    const bad = items.find((item) => !(num(item.unitPrice) > 0) || !(num(item.quantity) >= 1));
    if (bad) return showToast("error", `Enter quantity and purchase price for "${bad.productName}"`);
    const overDiscount = items.find((item) => num(item.discount) > num(item.quantity) * num(item.unitPrice));
    if (overDiscount) return showToast("error", `Discount on "${overDiscount.productName}" is more than its subtotal`);
    if (head.dueDate && head.dueDate < head.purchaseDate) return showToast("error", "Due date cannot be before the purchase date");
    if (totals.due < 0) return showToast("error", "Paid amount is more than the grand total");
    if (lossLines.length && !confirm(`${lossLines.length} product(s) will sell at or below this cost to some buyer types. Save anyway?`)) return;

    setSaving(true);
    try {
      const { data } = await axios.post("/api/purchase/create", {
        ...head,
        showroomId: till.id,
        purchaseNumber: head.purchaseNumber,
        purchaseOrderId: order?._id || null,
        attachment,
        items: items.map((item) => ({
          variantId: item.variantId,
          quantity: num(item.quantity),
          extraQty: num(item.extraQty),
          unitPrice: num(item.unitPrice),
          discount: num(item.discount),
          expireDate: item.expireDate || null,
          imeis: item.imeis,
        })),
        discountType: discount.type,
        discountValue: num(discount.value),
        shippingCost: num(shippingCost),
        payments: payments.filter((p) => num(p.amount) > 0).map((p) => ({ ...p, amount: num(p.amount) })),
      });

      if (!data.success) return showToast("error", data.message || "Could not save purchase");

      showToast(
        "success",
        head.status === "received" ? `${data.data.purchaseNumber} saved and stock updated` : `${data.data.purchaseNumber} saved as pending`,
      );
      router.push(ADMIN_PURCHASE_VIEW(data.data._id));
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not save purchase");
    } finally {
      setSaving(false);
    }
  };

  const setH = (key) => (e) => setHead({ ...head, [key]: e.target.value });

  if (step === "pick") {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Add products</h1>
            <p className="text-sm text-muted-foreground">Tap a product, the same way as the POS. The purchase form opens after that.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={ADMIN_PURCHASE_SHOW} className={btn.primary}>
              <List size={14} /> Purchase List
            </Link>
            <button
              type="button"
              disabled={!items.length}
              onClick={() => setStep("form")}
              className={`${btn.success} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              Add product to Purchase Product{items.length ? ` · ${items.length}` : ""}
            </button>
          </div>
        </div>
        <PurchasePosPicker onPick={addItem} showroomId={till.id} picked={items} />
      </div>
    );
  }

  return (
    <form onSubmit={save} noValidate className="space-y-4">
      <ListCard
        title="Purchase Product"
        actions={
          <Link href={ADMIN_PURCHASE_SHOW} className={btn.primary}>
            <List size={14} /> Purchase List
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Supplier Name" required htmlFor="pur-supplier">
            <SupplierPicker
              id="pur-supplier"
              value={head.supplierId}
              onChange={(supplierId) => setHead((h) => ({ ...h, supplierId }))}
              suppliers={suppliers}
              reload={reloadSuppliers}
            />
          </Field>
          <Field label="Invoice No" htmlFor="pur-number">
            <input
              id="pur-number"
              value={head.purchaseNumber}
              maxLength={40}
              onChange={(e) => setHead({ ...head, purchaseNumber: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Purchase Date" required htmlFor="pur-date">
            <input id="pur-date" type="date" value={head.purchaseDate} onChange={setH("purchaseDate")} className={inputClass} />
          </Field>
          <Field label="Due Date" htmlFor="pur-due">
            <input id="pur-due" type="date" value={head.dueDate} min={head.purchaseDate} onChange={setH("dueDate")} className={inputClass} />
          </Field>
          <Field label="Reference" htmlFor="pur-ref">
            <input id="pur-ref" value={head.referenceNo} onChange={setH("referenceNo")} placeholder="Supplier's invoice / challan no" maxLength={255} className={inputClass} />
          </Field>
          <Field label="Note" htmlFor="pur-note">
            <input id="pur-note" value={head.note} onChange={setH("note")} placeholder="Note" maxLength={5000} className={inputClass} />
          </Field>
          <Field label="Attachment" htmlFor="pur-attach">
            <AttachmentInput id="pur-attach" value={attachment} onChange={setAttachment} />
          </Field>
          <Field label="Stock" htmlFor="pur-status">
            <select id="pur-status" value={head.status} onChange={setH("status")} className={inputClass}>
              <option value="received">Received now (stock in)</option>
              <option value="pending">Pending (goods not in yet)</option>
            </select>
          </Field>
          <Field label="Stock In To">
            <input value={stockInTo || "Loading…"} readOnly className={inputClass} />
          </Field>
        </div>
      </ListCard>

      <ListCard title="Products">
        {order && (
          <p className="m-0 mb-3 flex items-center gap-2 rounded-[6px] bg-[#eaf4fd] px-3 py-[9px] text-[13px] text-[#1766a8]">
            <ClipboardList size={16} /> Receiving purchase order <b>{order.orderNumber}</b>. Adjust quantities if the delivery differs. Its new sale
            rates (marked ●) go onto the products when the goods are taken into stock.
          </p>
        )}

        <div className="mb-3 flex justify-end">
          <button type="button" onClick={() => setStep("pick")} className={btn.warning}>
            Add more products
          </button>
        </div>
        <ProductSearch onPick={addItem} />

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
            <thead>
              <tr className={theadClass}>
                {["SL No", "Product Name", "Received Qty", "Extra Qty", "Qty", "Actual Purchase Price", "Purchase Price", "Discount", "Subtotal", "Expire Date", "IMEI"].map((h) => (
                  <th key={h} className={`${thClass} text-center`}>
                    {h}
                  </th>
                ))}
                <th className={`${thClass} text-center`} aria-label="Remove">
                  <Trash2 size={14} className="mx-auto" />
                </th>
              </tr>
            </thead>
            <tbody>
              {!items.length && (
                <tr>
                  <td colSpan={12} className={`${tdClass} py-10 text-center text-muted-foreground`}>
                    Search above to add products to this purchase.
                  </td>
                </tr>
              )}
              {items.map((item, index) => {
                const cost = unitCost(item);
                const change = item.lastCost && cost ? round2(cost - item.lastCost) : 0;
                const units = num(item.quantity) + num(item.extraQty);
                return (
                  <tr key={item.variantId}>
                    <td className={tdClass}>{items.length - index}</td>
                    <td className={`${tdClass} min-w-[220px]`}>
                      <b className="block font-medium">
                        {item.productName}
                        {item.variantLabel && <span className="font-normal text-muted-foreground"> · {item.variantLabel}</span>}
                      </b>
                      <span className="block text-[12px] text-muted-foreground">
                        Barcode: <span className="font-mono">{item.barcode || "—"}</span> · Stock {item.stock}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => updateItem(index, { quantity: String(Math.max(1, num(item.quantity) - 1)) })}
                          className="flex h-[32px] w-[30px] items-center justify-center rounded-l-[4px] bg-[#ff5b5b] text-white hover:bg-[#f24242]"
                          aria-label={`One less ${item.productName}`}
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: e.target.value })}
                          className={`${cell} w-[64px] rounded-none text-center`}
                          aria-label={`Received quantity for ${item.productName}`}
                        />
                        <button
                          type="button"
                          onClick={() => updateItem(index, { quantity: String(num(item.quantity) + 1) })}
                          className="flex h-[32px] w-[30px] items-center justify-center rounded-r-[4px] bg-[#10c469] text-white hover:bg-[#0eab5c]"
                          aria-label={`One more ${item.productName}`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </td>
                    <td className={tdClass}>
                      <input type="number" min="0" value={item.extraQty} placeholder="0" onChange={(e) => updateItem(index, { extraQty: e.target.value })} className={`${cell} w-[80px]`} aria-label={`Extra quantity for ${item.productName}`} />
                    </td>
                    <td className={`${tdClass} font-semibold`}>{units}</td>
                    <td className={tdClass}>
                      <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(index, { unitPrice: e.target.value })} className={`${cell} w-[110px]`} aria-label={`Price for ${item.productName}`} />
                    </td>
                    <td className={`${tdClass} whitespace-nowrap`}>
                      {money(round2(cost))}
                      {change !== 0 && (
                        <span className={`block text-[11px] ${change > 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {change > 0 ? "▲" : "▼"} {money(Math.abs(change))} vs last
                        </span>
                      )}
                    </td>
                    <td className={tdClass}>
                      <input type="number" min="0" step="0.01" value={item.discount} placeholder="0" onChange={(e) => updateItem(index, { discount: e.target.value })} className={`${cell} w-[90px]`} aria-label={`Discount for ${item.productName}`} />
                    </td>
                    <td className={`${tdClass} font-semibold`}>{money(round2(lineTotal(item)))}</td>
                    <td className={tdClass}>
                      <input type="date" value={item.expireDate} onChange={(e) => updateItem(index, { expireDate: e.target.value })} className={`${cell} w-[140px]`} aria-label={`Expire date for ${item.productName}`} />
                    </td>
                    <td className={tdClass}>
                      <button
                        type="button"
                        onClick={() => openImei(index)}
                        className={`whitespace-nowrap rounded-[4px] px-2 py-1 text-[12px] font-medium ${
                          item.imeis.length && item.imeis.length === units
                            ? "bg-emerald-100 text-emerald-700"
                            : item.trackSerial
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600 dark:bg-muted dark:text-muted-foreground"
                        }`}
                      >
                        {item.trackSerial || item.imeis.length ? `${item.imeis.length}/${units}` : "+ IMEI"}
                      </button>
                    </td>
                    <td className={tdClass}>
                      <button type="button" onClick={() => removeItem(index)} className="rounded-[4px] bg-[#ff5b5b] p-1.5 text-white hover:bg-[#f24242]" aria-label={`Remove ${item.productName}`}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className={totalRowClass}>
                  <td colSpan={4} className={tdClass}>
                    Total ({items.length} products)
                  </td>
                  <td className={tdClass}>{totals.itemCount}</td>
                  <td colSpan={3} className={tdClass} />
                  <td className={tdClass}>{money(totals.subtotal)}</td>
                  <td colSpan={3} className={tdClass} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {lossLines.length > 0 && (
          <p className="m-0 mt-2 rounded-[4px] bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:bg-red-500/10 dark:text-red-300">
            At this cost {lossLines.map((l) => l.productName).join(", ")} sells at a loss to some buyer types. Raise its rates on the product after
            this purchase.
          </p>
        )}

        <div className="mt-6 border-t border-[#ebeff2] pt-5 dark:border-border">
          <div className="ml-auto max-w-[760px] space-y-3">
            <SumRow label="Item Count">
              <Box>{totals.itemCount}</Box>
            </SumRow>
            <SumRow label="Subtotal">
              <Box>{money(totals.subtotal)}</Box>
            </SumRow>
            <SumRow label="Discount">
              <div className="flex">
                <select value={discount.type} onChange={(e) => setDiscount({ ...discount, type: e.target.value })} className={`${inputClass} !w-[130px] !rounded-r-none`} aria-label="Discount type">
                  <option value="amount">Amount</option>
                  <option value="percent">Percentage</option>
                </select>
                <input type="number" min="0" step="0.01" placeholder="0" value={discount.value} onChange={(e) => setDiscount({ ...discount, value: e.target.value })} className={`${inputClass} !rounded-l-none text-right`} aria-label="Discount value" />
              </div>
            </SumRow>
            <SumRow label="Total Discount">
              <Box>{money(totals.discountAmount)}</Box>
            </SumRow>
            <SumRow label="Shipping / Labour (+)">
              <input type="number" min="0" step="0.01" placeholder="0" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} className={`${inputClass} text-right`} aria-label="Shipping or labour cost" />
            </SumRow>
            <SumRow label="Grand Total" strong>
              <Box strong>{money(totals.grand)}</Box>
            </SumRow>
            {payments.map((payment, index) => (
              <SumRow key={index} label={index === 0 ? "Payment Type" : ""}>
                <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                  <select value={payment.method} onChange={(e) => setPayment(index, { method: e.target.value })} className={`${inputClass} sm:!w-[170px]`} aria-label="Payment type">
                    {PAYMENT_METHODS.map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {payment.method !== "cash" && (
                    <input
                      placeholder={payment.method === "cheque" ? "Cheque No." : "Trx / reference"}
                      value={payment.reference}
                      onChange={(e) => setPayment(index, { reference: e.target.value })}
                      className={inputClass}
                      aria-label="Payment reference"
                    />
                  )}
                  <input type="number" min="0" step="0.01" placeholder="Amount" value={payment.amount} onChange={(e) => setPayment(index, { amount: e.target.value })} className={`${inputClass} text-right`} aria-label="Paying amount" />
                  {index === 0 ? (
                    <button type="button" onClick={() => setPayments([...payments, newPayment()])} className="flex h-[38px] w-[42px] shrink-0 items-center justify-center rounded-[4px] border border-[#10c469] text-[#10c469] hover:bg-[#10c469] hover:text-white" aria-label="Add another payment" title="Add another payment">
                      <Plus size={16} />
                    </button>
                  ) : (
                    <button type="button" onClick={() => setPayments(payments.filter((_, i) => i !== index))} className="flex h-[38px] w-[42px] shrink-0 items-center justify-center rounded-[4px] border border-[#ff5b5b] text-[#ff5b5b] hover:bg-[#ff5b5b] hover:text-white" aria-label="Remove payment">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </SumRow>
            ))}
            <SumRow label="Paid">
              <div className="flex gap-2">
                <Box tone="text-[#0b8a45]">{money(totals.paid)}</Box>
                {totals.grand > 0 && (
                  <button type="button" className={`${btn.warning} shrink-0`} onClick={payFull}>
                    Pay full
                  </button>
                )}
              </div>
            </SumRow>
            <SumRow label="Due" strong>
              <Box strong tone={totals.due > 0 ? "text-[#ff5b5b]" : ""}>{money(totals.due)}</Box>
            </SumRow>
          </div>
        </div>

        <div className="mt-[18px] flex justify-end gap-2">
          <button type="button" className={btn.secondary} onClick={() => router.push(ADMIN_PURCHASE_SHOW)}>
            Cancel
          </button>
          <button type="submit" disabled={saving || !items.length} className={`${btn.success} min-w-[120px] !text-[15px]`}>
            {saving ? "Saving..." : head.status === "received" ? "Buy" : "Save as Pending"}
          </button>
        </div>
      </ListCard>

      <Dialog open={imeiRow !== null} onOpenChange={(open) => !open && setImeiRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>IMEI — {imeiRow !== null ? `${items[imeiRow]?.productName} ${items[imeiRow]?.variantLabel || ""}` : ""}</DialogTitle>
          </DialogHeader>
          <textarea
            rows={8}
            value={imeiText}
            onChange={(e) => setImeiText(e.target.value)}
            placeholder={"356938035643809\n356938035643810"}
            className={`${inputClass} !h-auto py-2 font-mono`}
            autoFocus
          />
          <p className="m-0 text-[12px] text-muted-foreground">
            One per line; scan them one after another.{" "}
            {imeiRow !== null &&
              `${imeiText.split(/[\n,]/).filter((s) => s.trim()).length} of ${num(items[imeiRow]?.quantity) + num(items[imeiRow]?.extraQty)} entered.`}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImeiRow(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveImeis}>
              Save IMEI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

// one line of the totals: label on the left, value box on the right
function SumRow({ label, strong, children }) {
  return (
    <div className="grid grid-cols-1 items-center gap-1 sm:grid-cols-[170px_1fr] sm:gap-4">
      <span className={`text-[14px] sm:text-right ${strong ? "text-[16px] font-bold" : "font-medium"}`}>{label}</span>
      {children}
    </div>
  );
}

function Box({ strong, tone = "", children }) {
  return (
    <div
      className={`flex h-[38px] w-full items-center justify-end rounded-[4px] bg-[#e9ecef] px-3 tabular-nums dark:bg-muted ${strong ? "text-[16px] font-bold" : "text-[14px]"} ${tone}`}
    >
      {children}
    </div>
  );
}
