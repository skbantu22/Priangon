"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Paperclip, Plus, Search, X, ScanBarcode } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { formatNumberBD } from "@/lib/bdFormat";
import { filterInput } from "@/components/ui/Application/Admin/listKit";
import { PAYMENT_METHODS } from "@/components/ui/Application/Admin/supplier/supplierKit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Pieces the purchase, purchase order and purchase return screens share,
 * laid out like the 360 purchase screens.
 */

// the four kinds of buyer, each with its own sale rate
export const RATES = [
  ["sellingPrice", "Buyer"],
  ["dealerPrice", "Dealer"],
  ["subDealerPrice", "Sub Dealer"],
  ["wholesalerPrice", "Wholesaler"],
];

export const num = (value) => Number(value || 0);

export const ORDER_STATUS_STYLE = {
  pending: "bg-[#fff6e0] text-[#b7791f]",
  received: "bg-[#e8f7f0] text-[#0b8a45]",
  cancelled: "bg-[#f1f3f5] text-[#6c757d]",
};

// the browser's own date, not UTC (Bangladesh is still "yesterday" in UTC until 6am)
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** A stored date as the yyyy-mm-dd a date input takes */
export const toInputDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Small number box inside a table row */
export const cell = `${filterInput} !h-[34px] !px-2 !text-[13px] tabular-nums`;

export function Field({ label, required, htmlFor, className = "", children }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-[6px] block text-[14px] font-medium text-[#212529] dark:text-foreground">
        {label}
        {required && <span className="ml-1 text-[#ff5b5b]">*</span>}
      </label>
      {children}
    </div>
  );
}

/** Active suppliers, and a way to reload them after one is added */
export function useSuppliers() {
  const [suppliers, setSuppliers] = useState([]);

  const fetchSuppliers = () =>
    axios
      .get("/api/supplier?active=true")
      .then(({ data }) => (data.success ? data.data : null))
      .catch(() => {
        showToast("error", "Could not load suppliers");
        return null;
      });

  useEffect(() => {
    let cancelled = false;
    fetchSuppliers().then((list) => !cancelled && list && setSuppliers(list));
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(async () => {
    const list = await fetchSuppliers();
    if (list) setSuppliers(list);
  }, []);

  return [suppliers, reload];
}

/** Supplier dropdown with the blue "+" that adds one on the spot */
export function SupplierPicker({ id, value, onChange, suppliers, reload, placeholder = "Select or Add Supplier" }) {
  const add = async () => {
    const name = window.prompt("Supplier name")?.trim();
    if (!name) return;
    const phone = window.prompt("Supplier mobile")?.trim();
    if (!phone) return;

    try {
      const { data } = await axios.post("/api/supplier/create", { name, phone });
      if (!data.success) return showToast("error", data.message || "Could not add supplier");
      await reload();
      if (data.data?._id) onChange(data.data._id);
      showToast("success", `Supplier "${name}" added`);
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not add supplier");
    }
  };

  return (
    <div className="flex">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${filterInput} rounded-r-none`}>
        <option value="">{placeholder}</option>
        {suppliers.map((s) => (
          <option key={s._id} value={s._id}>
            {s.name}
            {s.phone ? ` (${s.phone})` : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={add}
        title="Add supplier"
        aria-label="Add supplier"
        className="flex h-[38px] w-[42px] shrink-0 items-center justify-center rounded-r-[6px] bg-[#188ae2] text-white hover:bg-[#1379c7]"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

/**
 * Product search for a purchase form. Scanning a barcode and pressing
 * Enter takes the exact hit at once; typing shows a list to pick from.
 * Each hit carries stock, last cost and the four sale rates.
 */
export function ProductSearch({ onPick, placeholder = "Scan barcode or type product name / code / SKU", autoFocus = true }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const [lastAdded, setLastAdded] = useState("");
  const box = useRef(null);

  const search = async (q) => {
    const { data } = await axios.get(`/api/purchase/variant-search?q=${encodeURIComponent(q)}`);
    return data.success ? data.data : [];
  };

  // debounced so a scanner typing character by character hits the API once
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await search(query.trim()));
        setActive(0);
      } catch {
        showToast("error", "Product search failed");
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const pick = (hit) => {
    onPick(hit);
    setLastAdded(`${hit.productName}${hit.variantLabel ? ` · ${hit.variantLabel}` : ""}`);
    setQuery("");
    setResults([]);
    setActive(0);
    box.current?.focus();
  };

  const exactIn = (list, q) => list.find((r) => r.barcode?.toLowerCase() === q || r.sku?.toLowerCase() === q);

  const onKey = async (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!results.length) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + results.length) % results.length);
      return;
    }
    if (event.key === "Escape") {
      setResults([]);
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;

    // a scanner types the code and presses Enter before the search above
    // has answered: look the code up now instead of doing nothing
    let list = results;
    let exact = exactIn(list, q);
    if (!exact && (searching || !list.length)) {
      try {
        list = await search(query.trim());
      } catch {
        return showToast("error", "Product search failed");
      }
      exact = exactIn(list, q);
    }
    if (exact) return pick(exact);
    if (list.length === 1) return pick(list[0]);
    if (list.length > 1) return pick(list[Math.min(active, list.length - 1)]);
    showToast("error", `No product found for "${query.trim()}"`);
  };

  return (
    <div className="relative">
      <div className="flex">
        <span className="flex h-[38px] w-[42px] shrink-0 items-center justify-center rounded-l-[4px] border border-r-0 border-[#e3e3e3] bg-[#f1f3f5] text-[#3b4652] dark:border-border dark:bg-muted">
          <ScanBarcode size={18} />
        </span>
        <input
          ref={box}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder}
          className={`${filterInput} !rounded-l-none`}
          autoFocus={autoFocus}
          aria-label="Scan or search product"
        />
      </div>
      <p className="m-0 mt-1 min-h-[16px] text-[12px] text-muted-foreground">
        {lastAdded ? (
          <>
            Added <b className="text-[#0b8a45]">{lastAdded}</b> · scan the next one
          </>
        ) : (
          "Scan a barcode, or type and use ↑ ↓ and Enter."
        )}
      </p>
      {(results.length > 0 || searching) && (
        <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-[6px] border border-[#e3e3e3] bg-white shadow-lg dark:bg-popover">
          {searching && !results.length ? (
            <p className="m-0 p-3 text-[13px] text-muted-foreground">Searching...</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.variantId}
                type="button"
                onClick={() => pick(r)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-[13px] last:border-b-0 ${
                  i === active ? "bg-[#e8f3fd] dark:bg-muted" : "hover:bg-[#f1f7fd] dark:hover:bg-muted"
                }`}
              >
                <span className="min-w-0">
                  <span className="font-medium">{r.productName}</span>
                  {r.variantLabel && <span className="text-muted-foreground"> — {r.variantLabel}</span>}
                  <span className="block font-mono text-[11px] text-muted-foreground">{r.barcode || r.sku}</span>
                </span>
                <span className="shrink-0 text-right text-[12px] text-muted-foreground">
                  Stock {r.stock}
                  {r.lastCost > 0 && <span className="block">Last cost {r.lastCost}</span>}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * File box for the supplier's invoice / challan. Uploads as soon as a file
 * is chosen; `value` is { url, publicId } once it is up.
 */
export function AttachmentInput({ id, value, onChange }) {
  const [uploading, setUploading] = useState(false);

  const choose = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) return showToast("error", "The attachment must be 4 MB or smaller");

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await axios.post("/api/purchase/attachment", form);
      if (!data.success) return showToast("error", data.message || "Upload failed");
      onChange({ ...data.data, name: file.name });
    } catch (error) {
      showToast("error", error.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (value?.url) {
    return (
      <div className="flex h-[38px] items-center gap-2 rounded-[6px] border border-[#e3e3e3] px-3 text-[13px]">
        <Paperclip size={14} className="shrink-0 text-[#98a6ad]" />
        <a href={value.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-[#188ae2] hover:underline">
          {value.name || "View attachment"}
        </a>
        <button type="button" onClick={() => onChange(null)} className="text-[#ff5b5b]" aria-label="Remove attachment">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <input
      id={id}
      type="file"
      accept="image/png,image/jpeg,image/webp,application/pdf"
      onChange={choose}
      disabled={uploading}
      className="block w-full text-[13px] file:mr-2 file:rounded file:border-0 file:bg-[#e9ecef] file:px-3 file:py-2 disabled:opacity-60"
      title={uploading ? "Uploading..." : undefined}
    />
  );
}

/**
 * Pay the supplier against one purchase. `purchase` opens it; onDone runs
 * after the payment is saved.
 */
export function PurchasePayDialog({ purchase, onClose, onDone }) {
  return (
    <Dialog open={!!purchase} onOpenChange={(open) => !open && onClose()}>
      {/* keyed, so every purchase opens with its own due filled in */}
      {purchase && <PayForm key={purchase._id} purchase={purchase} onClose={onClose} onDone={onDone} />}
    </Dialog>
  );
}

function PayForm({ purchase, onClose, onDone }) {
  const [form, setForm] = useState({ amount: String(purchase.dueAmount), method: "cash", reference: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const amount = num(form.amount);
    if (!(amount > 0)) return showToast("error", "Enter a payment amount");
    if (amount - purchase.dueAmount > 0.009) return showToast("error", "More than the due on this purchase");

    setSaving(true);
    try {
      const { data } = await axios.post(`/api/purchase/payment/${purchase._id}`, { ...form, amount });
      if (!data.success) return showToast("error", data.message || "Could not record the payment");
      showToast("success", "Payment recorded");
      onDone?.();
      onClose();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not record the payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          Pay {purchase.purchaseNumber} — {purchase.supplierName}
        </DialogTitle>
        <DialogDescription>Due on this purchase: ৳{formatNumberBD(purchase.dueAmount)}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <Field label="Amount" htmlFor="pay-amount">
          <input id="pay-amount" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={filterInput} />
        </Field>
        <Field label="Method" htmlFor="pay-method">
          <select id="pay-method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className={filterInput}>
            {PAYMENT_METHODS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Trx ID / Cheque No" htmlFor="pay-ref">
          <input id="pay-ref" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className={filterInput} />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Record Payment"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/** Logo on the left, document title and numbers on the right — top of a printed invoice */
export function PrintHeader({ title, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ebeff2] pb-[16px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/sbt-logo-wide.png" alt="SB Telecom" className="h-[54px] w-auto" />
      <div className="text-right">
        <h2 className="m-0 text-[20px] font-bold tracking-[0.02em]">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Supplier left, a second block right — the party lines of a printed invoice */
export function PartyBlock({ label, name, lines = [] }) {
  return (
    <div>
      <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#98a6ad]">{label}</p>
      <p className="m-0 mt-1 text-[15px] font-semibold">{name}</p>
      {lines.filter(Boolean).map((line) => (
        <p key={line} className="m-0 text-[#6c757d]">
          {line}
        </p>
      ))}
    </div>
  );
}
