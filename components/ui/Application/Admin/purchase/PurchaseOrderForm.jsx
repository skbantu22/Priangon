"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Trash2 } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { ADMIN_PURCHASE_ORDER_SHOW } from "@/Route/Adminpannelroute";
import { ListCard, btn, filterInput as inputClass, tdClass, thClass, theadClass, totalRowClass } from "@/components/ui/Application/Admin/listKit";
import { money } from "@/components/ui/Application/Admin/supplier/supplierKit";
import {
  AttachmentInput,
  Field,
  ProductSearch,
  RATES,
  SupplierPicker,
  cell,
  num,
  toInputDate,
  today,
  useSuppliers,
} from "@/components/ui/Application/Admin/purchase/purchaseKit";

const prevField = (field) => `prev${field[0].toUpperCase()}${field.slice(1)}`;

const subtotalOf = (line) => num(line.quantity) * num(line.purchasePrice);
const totalOf = (line) => Math.max(0, subtotalOf(line) - num(line.discount));

/**
 * Create or edit a purchase order — a request to the supplier. Nothing
 * moves in stock or in the supplier's balance until it is received, which
 * turns it into a purchase.
 *
 * Like 360's order screen it carries the new purchase price per piece, and
 * where 360 has one new MRP, ours has a new rate for each kind of buyer:
 * buyer, dealer, sub dealer and wholesaler. They start at today's rates and
 * are put onto the product when the goods arrive.
 */
export default function PurchaseOrderForm({ id }) {
  const router = useRouter();
  const [suppliers, reloadSuppliers] = useSuppliers();

  const [head, setHead] = useState({
    supplierId: "",
    orderNumber: "",
    reference: "",
    orderDate: today(),
    deliveryDate: today(),
    note: "",
  });
  const [attachment, setAttachment] = useState(null);
  const [lines, setLines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) {
      axios
        .get("/api/purchase/next-number?kind=order")
        .then(({ data }) => data.success && setHead((h) => ({ ...h, orderNumber: h.orderNumber || data.number })))
        .catch(() => {});
      return;
    }

    axios
      .get(`/api/purchase-orders/${id}`)
      .then(({ data }) => {
        if (!data.success) return showToast("error", data.message || "Purchase order not found");
        const order = data.data;

        if (order.status !== "pending") {
          showToast("error", `${order.orderNumber} is ${order.status} and cannot be edited`);
          return router.push(ADMIN_PURCHASE_ORDER_SHOW);
        }

        setHead({
          supplierId: String(order.supplierId?._id || order.supplierId),
          orderNumber: order.orderNumber,
          reference: order.reference || "",
          orderDate: toInputDate(order.orderDate),
          deliveryDate: toInputDate(order.deliveryDate),
          note: order.note || "",
        });
        if (order.attachment?.url) setAttachment(order.attachment);
        setLines(
          order.items.map((item) => ({
            variantId: String(item.variantId),
            productName: item.productName,
            variantLabel: item.variantLabel,
            barcode: item.barcode,
            stock: item.stockAtOrder,
            lastCost: item.prevPurchasePrice,
            prev: Object.fromEntries(RATES.map(([f]) => [f, num(item[prevField(f)])])),
            // a rate the order does not change is stored as 0: show today's again
            rates: Object.fromEntries(
              RATES.map(([f]) => [f, num(item[f]) ? String(item[f]) : num(item[prevField(f)]) ? String(item[prevField(f)]) : ""]),
            ),
            purchasePrice: String(item.purchasePrice),
            quantity: String(item.quantity),
            extraQty: item.extraQty ? String(item.extraQty) : "",
            discount: item.discount ? String(item.discount) : "",
          })),
        );
      })
      .catch((error) => showToast("error", error.response?.data?.message || "Could not load the order"))
      .finally(() => setLoading(false));
  }, [id, router]);

  const addLine = (hit) =>
    setLines((current) => {
      const at = current.findIndex((line) => line.variantId === hit.variantId);
      if (at >= 0) return current.map((line, i) => (i === at ? { ...line, quantity: String(num(line.quantity) + 1) } : line));
      return [
        ...current,
        {
          variantId: hit.variantId,
          productName: hit.productName,
          variantLabel: hit.variantLabel,
          barcode: hit.barcode || hit.sku,
          stock: hit.stock,
          lastCost: hit.lastCost,
          prev: hit.rates,
          // today's rates to start from; the order keeps whatever is typed
          rates: Object.fromEntries(RATES.map(([f]) => [f, hit.rates?.[f] ? String(hit.rates[f]) : ""])),
          purchasePrice: hit.lastCost ? String(hit.lastCost) : "",
          quantity: "1",
          extraQty: "",
          discount: "",
        },
      ];
    });

  const setLine = (index, patch) => setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const setRate = (index, field, value) =>
    setLines((current) => current.map((line, i) => (i === index ? { ...line, rates: { ...line.rates, [field]: value } } : line)));

  const grand = useMemo(() => lines.reduce((sum, line) => sum + totalOf(line), 0), [lines]);

  const save = async (event) => {
    event.preventDefault();

    if (!head.supplierId) return showToast("error", "Select a supplier");
    if (!lines.length) return showToast("error", "Add at least one product");
    if (!head.deliveryDate) return showToast("error", "Delivery date is required");
    if (head.deliveryDate < head.orderDate) return showToast("error", "Delivery date cannot be before the order date");
    const bad = lines.find((line) => !(num(line.quantity) >= 1) || !(num(line.purchasePrice) > 0));
    if (bad) return showToast("error", `Enter quantity and purchase price for "${bad.productName}"`);
    const overDiscount = lines.find((line) => num(line.discount) > subtotalOf(line));
    if (overDiscount) return showToast("error", `Discount on "${overDiscount.productName}" is more than its subtotal`);

    setSaving(true);
    try {
      const body = {
        ...head,
        attachment,
        items: lines.map((line) => ({
          variantId: line.variantId,
          purchasePrice: num(line.purchasePrice),
          quantity: num(line.quantity),
          extraQty: num(line.extraQty),
          discount: num(line.discount),
          ...Object.fromEntries(RATES.map(([f]) => [f, num(line.rates[f])])),
        })),
      };
      const { data } = id ? await axios.put(`/api/purchase-orders/${id}`, body) : await axios.post("/api/purchase-orders", body);

      if (!data.success) return showToast("error", data.message || "Could not save the order");
      showToast("success", data.message);
      router.push(ADMIN_PURCHASE_ORDER_SHOW);
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not save the order");
    } finally {
      setSaving(false);
    }
  };

  const setH = (key) => (e) => setHead({ ...head, [key]: e.target.value });

  if (loading) return <div className="h-[420px] animate-pulse rounded-[8px] bg-white dark:bg-card" />;

  return (
    <form onSubmit={save} noValidate className="space-y-4">
      <ListCard title={id ? "Edit Purchase Order" : "Purchase Order Create"}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Supplier Name" required htmlFor="po-supplier" className="md:col-span-2">
            <SupplierPicker
              id="po-supplier"
              value={head.supplierId}
              onChange={(supplierId) => setHead((h) => ({ ...h, supplierId }))}
              suppliers={suppliers}
              reload={reloadSuppliers}
              placeholder="Select"
            />
          </Field>
          <Field label="P.O. Invoice No" htmlFor="po-number">
            <input id="po-number" value={head.orderNumber} onChange={setH("orderNumber")} maxLength={40} className={inputClass} />
          </Field>
          <Field label="Reference" htmlFor="po-ref">
            <input id="po-ref" value={head.reference} onChange={setH("reference")} placeholder="Reference" maxLength={255} className={inputClass} />
          </Field>
          <Field label="Date" required htmlFor="po-date">
            <input id="po-date" type="date" value={head.orderDate} onChange={setH("orderDate")} className={inputClass} />
          </Field>
          <Field label="Delivery Date" required htmlFor="po-delivery">
            <input id="po-delivery" type="date" value={head.deliveryDate} min={head.orderDate} onChange={setH("deliveryDate")} className={inputClass} />
          </Field>
          <Field label="Attachment" htmlFor="po-attach" className="md:col-span-2">
            <AttachmentInput id="po-attach" value={attachment} onChange={setAttachment} />
          </Field>
          <Field label="Note" htmlFor="po-note" className="md:col-span-2 xl:col-span-4">
            <textarea
              id="po-note"
              rows={3}
              value={head.note}
              onChange={setH("note")}
              placeholder="Terms, delivery instructions…"
              maxLength={20000}
              className={`${inputClass} !h-auto py-2`}
            />
          </Field>
        </div>
      </ListCard>

      <ListCard title="Products">
        <ProductSearch onPick={addLine} placeholder="Enter Product Name / SKU / scan barcode" />

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[1500px] border-collapse text-left text-sm">
            <thead>
              <tr className={theadClass}>
                {["Product", "Stock", "Purchase Price", "PPP"].map((h) => (
                  <th key={h} rowSpan={2} className={thClass} title={h === "PPP" ? "New purchase price per piece" : undefined}>
                    {h}
                  </th>
                ))}
                <th colSpan={4} className={`${thClass} text-center`}>
                  New sale rate (now → new · margin)
                </th>
                {["P.O. Qty", "Extra Qty", "Sub Total", "Discount", "Total"].map((h) => (
                  <th key={h} rowSpan={2} className={thClass}>
                    {h}
                  </th>
                ))}
                <th rowSpan={2} className={thClass} aria-label="Remove" />
              </tr>
              <tr className={theadClass}>
                {RATES.map(([f, label]) => (
                  <th key={f} className={thClass}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!lines.length && (
                <tr>
                  <td colSpan={14} className={`${tdClass} py-10 text-center text-muted-foreground`}>
                    Search above to add products to this order.
                  </td>
                </tr>
              )}
              {lines.map((line, index) => {
                const cost = num(line.quantity) + num(line.extraQty) ? totalOf(line) / (num(line.quantity) + num(line.extraQty)) : 0;
                return (
                  <tr key={line.variantId}>
                    <td className={`${tdClass} min-w-[200px]`}>
                      <b className="block font-medium">{line.productName}</b>
                      <span className="text-[12px] text-muted-foreground">{[line.variantLabel, line.barcode].filter(Boolean).join(" · ")}</span>
                    </td>
                    <td className={tdClass}>{line.stock}</td>
                    <td className={tdClass}>{money(line.lastCost)}</td>
                    <td className={tdClass}>
                      <input type="number" min="0" step="0.01" value={line.purchasePrice} onChange={(e) => setLine(index, { purchasePrice: e.target.value })} className={`${cell} w-[100px]`} aria-label={`New purchase price for ${line.productName}`} />
                    </td>
                    {RATES.map(([f, label]) => {
                      const rate = num(line.rates[f]);
                      const pct = rate && cost ? Math.round(((rate - cost) / cost) * 100) : null;
                      const loss = pct !== null && pct <= 0;
                      const changed = rate && num(line.prev?.[f]) !== rate;
                      return (
                        <td key={f} className={tdClass}>
                          <span className="block text-[11px] text-muted-foreground">now {line.prev?.[f] ? money(line.prev[f]) : "not set"}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.rates[f]}
                            placeholder="keep"
                            onChange={(e) => setRate(index, f, e.target.value)}
                            className={`${cell} w-[96px] ${changed ? "!border-[#188ae2]" : ""} ${loss ? "!border-[#ff5b5b]" : ""}`}
                            aria-label={`New ${label} rate for ${line.productName}`}
                          />
                          {pct !== null && (
                            <span className={`block text-[11px] ${loss ? "font-semibold text-red-600" : "text-emerald-600"}`}>
                              {pct > 0 ? "+" : ""}
                              {pct}%
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className={tdClass}>
                      <input type="number" min="1" value={line.quantity} onChange={(e) => setLine(index, { quantity: e.target.value })} className={`${cell} w-[80px]`} aria-label={`Order quantity for ${line.productName}`} />
                    </td>
                    <td className={tdClass}>
                      <input type="number" min="0" value={line.extraQty} placeholder="0" onChange={(e) => setLine(index, { extraQty: e.target.value })} className={`${cell} w-[80px]`} aria-label={`Extra quantity for ${line.productName}`} />
                    </td>
                    <td className={tdClass}>{money(subtotalOf(line))}</td>
                    <td className={tdClass}>
                      <input type="number" min="0" step="0.01" value={line.discount} placeholder="0" onChange={(e) => setLine(index, { discount: e.target.value })} className={`${cell} w-[90px]`} aria-label={`Discount for ${line.productName}`} />
                    </td>
                    <td className={`${tdClass} font-semibold`}>{money(totalOf(line))}</td>
                    <td className={tdClass}>
                      <button type="button" onClick={() => setLines(lines.filter((_, i) => i !== index))} className="rounded-[4px] bg-[#ff5b5b] p-1.5 text-white hover:bg-[#f24242]" aria-label={`Remove ${line.productName}`}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {lines.length > 0 && (
              <tfoot>
                <tr className={totalRowClass}>
                  <td colSpan={12} className={tdClass}>
                    Total
                  </td>
                  <td className={tdClass}>৳ {money(grand)}</td>
                  <td className={tdClass} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <p className="m-0 mt-2 text-[12px] text-muted-foreground">
          Sale rates change on the product only when this order is received. Leave a rate empty to keep the current one.
        </p>

        <div className="mt-[18px] flex justify-end gap-2">
          <button type="button" className={btn.secondary} onClick={() => router.push(ADMIN_PURCHASE_ORDER_SHOW)}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={`${btn.success} min-w-[120px]`}>
            {saving ? "Saving..." : id ? "Update" : "Submit"}
          </button>
        </div>
      </ListCard>
    </form>
  );
}
