"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { RotateCcw, Search, X } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PAYMENT_METHODS } from "@/components/ui/Application/Admin/supplier/supplierKit";

const TEXT = {
  en: {
    title: "Return",
    search: "Product, barcode, IMEI or invoice no",
    hint: "Type a product name, barcode, IMEI or invoice number to find what is coming back.",
    none: "Nothing left to return for this search.",
    loading: "Searching...",
    sold: "Sold",
    can: "Can return",
    qty: "Return qty",
    damaged: "Damaged (of these)",
    damagedTick: "Damaged",
    good: "Back in stock",
    broken: "Damaged",
    total: "Return total",
    refund: "Cash refunded",
    refundHint: "0 = take it off the due",
    method: "Refund by",
    note: "Why is it coming back?",
    save: "Save Return",
    saving: "Saving...",
    pick: "Choose what is coming back",
    saved: "Return saved",
    close: "Close",
  },
  bn: {
    title: "পণ্য ফেরত",
    search: "পণ্যের নাম, বারকোড, IMEI বা ইনভয়েস নং",
    hint: "কী ফেরত আসছে খুঁজতে পণ্যের নাম, বারকোড, IMEI বা ইনভয়েস নং লিখুন।",
    none: "এই খোঁজে ফেরত নেওয়ার মতো কিছু নেই।",
    loading: "খোঁজা হচ্ছে...",
    sold: "বিক্রি",
    can: "ফেরতযোগ্য",
    qty: "ফেরত পরিমাণ",
    damaged: "এর মধ্যে নষ্ট",
    damagedTick: "নষ্ট",
    good: "স্টকে ফিরবে",
    broken: "নষ্ট",
    total: "ফেরতের মোট",
    refund: "নগদ ফেরত দিলাম",
    refundHint: "০ = বাকি থেকে কমবে",
    method: "কীভাবে দিলাম",
    note: "কেন ফেরত আসছে?",
    save: "ফেরত সেভ করুন",
    saving: "সেভ হচ্ছে...",
    pick: "কী ফেরত আসছে বেছে নিন",
    saved: "ফেরত সেভ হয়েছে",
    close: "বন্ধ",
  },
};

const money = (value) => (Math.round((Number(value) || 0) * 100) / 100).toLocaleString("en-US");
const keyOf = (row) => `${row.saleId}:${row.line}`;
const today = () => new Date().toISOString().slice(0, 10);

const inputClass = "h-10 w-full rounded-md border border-gray-300 bg-white px-2 text-[14px] text-gray-900 outline-none focus:border-primary";

/**
 * Take goods back without opening an invoice first: search by product,
 * barcode, IMEI or invoice number, say how many come back and how many of
 * those are broken. The good ones go back on the shelf, the broken ones to
 * the damaged shelf, and what the customer owes comes down by the lot.
 * Used by the POS and by Telekhata (where `customer` is the party).
 */
export default function ReturnSheet({ open, onClose, customer = null, showroomId = "", bn = false, onDone }) {
  const T = bn ? TEXT.bn : TEXT.en;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [picks, setPicks] = useState({}); // "saleId:line" → { row, qty, damaged, imeis, damagedImeis }
  const [form, setForm] = useState({ refundAmount: "", refundMethod: "cash", note: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setDebounced("");
    setPicks({});
    setForm({ refundAmount: "", refundMethod: "cash", note: "" });
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: found = [], isFetching, error: searchError } = useQuery({
    queryKey: ["sale-return-lines", customer?._id || "", showroomId || "", debounced],
    enabled: open,
    staleTime: 0,
    queryFn: async () => {
      const { data } = await axios.get("/api/sale-returns/returnable", {
        params: { customerId: customer?._id || "", showroomId: showroomId || "", q: debounced },
      });
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
  });

  // what is already chosen stays on top, whatever the search says now
  const chosen = Object.values(picks);
  const list = [...chosen.map((p) => p.row), ...found.filter((row) => !picks[keyOf(row)])];

  const qtyOf = (pick) => (pick.row.hasImeis ? pick.imeis.length : Number(pick.qty) || 0);
  const damagedOf = (pick) => (pick.row.hasImeis ? pick.damagedImeis.length : Number(pick.damaged) || 0);
  const worth = (pick) => qtyOf(pick) * pick.row.price * pick.row.charged;

  const lines = chosen.filter((p) => qtyOf(p) > 0);
  const items = lines.reduce((sum, p) => sum + qtyOf(p), 0);
  const broken = lines.reduce((sum, p) => sum + damagedOf(p), 0);
  const total = Math.round(lines.reduce((sum, p) => sum + worth(p), 0) * 100) / 100;

  const toggle = (row) =>
    setPicks((current) => {
      const key = keyOf(row);
      if (current[key]) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: { row, qty: "", damaged: "", imeis: [], damagedImeis: [] } };
    });

  const patch = (row, change) => setPicks((current) => ({ ...current, [keyOf(row)]: { ...current[keyOf(row)], ...change } }));

  const toggleImei = (pick, imei) => {
    const has = pick.imeis.includes(imei);
    const imeis = has ? pick.imeis.filter((x) => x !== imei) : [...pick.imeis, imei];
    patch(pick.row, { imeis, damagedImeis: pick.damagedImeis.filter((x) => imeis.includes(x)) });
  };

  const toggleDamaged = (pick, imei) =>
    patch(pick.row, {
      damagedImeis: pick.damagedImeis.includes(imei) ? pick.damagedImeis.filter((x) => x !== imei) : [...pick.damagedImeis, imei],
    });

  const save = async () => {
    if (!lines.length) return showToast("error", T.pick);

    for (const pick of lines) {
      const { row } = pick;
      if (qtyOf(pick) > row.returnable) return showToast("error", `${row.productName}: ${T.can} ${row.returnable}`);
      if (!Number.isInteger(damagedOf(pick)) || damagedOf(pick) > qtyOf(pick)) return showToast("error", `${row.productName}: ${T.damaged}`);
    }

    const refund = Math.max(0, Number(form.refundAmount) || 0);
    if (refund - total > 0.009) return showToast("error", `${T.refund} ≤ ${T.total}`);

    // one return per invoice; the cash refunded is shared out invoice by invoice
    const bySale = new Map();
    for (const pick of lines) {
      const group = bySale.get(pick.row.saleId) || [];
      group.push(pick);
      bySale.set(pick.row.saleId, group);
    }

    setSaving(true);
    let saved = 0;
    try {
      let left = refund;
      for (const [saleId, picked] of bySale) {
        const saleTotal = picked.reduce((sum, p) => sum + worth(p), 0);
        const give = Math.min(left, Math.round(saleTotal * 100) / 100);
        left = Math.round((left - give) * 100) / 100;

        const { data } = await axios.post("/api/sale-returns", {
          saleId,
          returnDate: today(),
          refundAmount: give,
          refundMethod: form.refundMethod,
          note: form.note,
          items: picked.map((p) => ({
            line: p.row.line,
            qty: qtyOf(p),
            imeis: p.imeis,
            damagedQty: damagedOf(p),
            damagedImeis: p.damagedImeis,
          })),
        });
        if (!data.success) throw new Error(data.message);
        saved += 1;
      }

      showToast("success", T.saved);
      queryClient.invalidateQueries({ queryKey: ["sale-return-lines"] });
      queryClient.invalidateQueries({ queryKey: ["telekhata-statement"] });
      queryClient.invalidateQueries({ queryKey: ["telekhata-parties"] });
      queryClient.invalidateQueries({ queryKey: ["telekhata-summary"] });
      queryClient.invalidateQueries({ queryKey: ["telekhata-history"] });
      onDone?.();
      onClose();
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Could not save the return";
      showToast("error", saved ? `${message} (${saved}/${bySale.size})` : message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} className="flex h-[92dvh] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-[86vh] sm:max-w-2xl">
        <DialogHeader className="flex-row items-center justify-between border-b px-4 py-3">
          <DialogTitle className="min-w-0 truncate text-[17px]">
            {T.title}
            {customer?.name ? ` · ${customer.name}` : ""}
          </DialogTitle>
          <button type="button" onClick={onClose} aria-label={T.close} className="rounded p-1 text-gray-500 hover:bg-gray-100">
            <X className="size-5" />
          </button>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          <label className="flex h-11 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 focus-within:border-primary">
            <Search className="size-5 shrink-0 text-gray-400" />
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={T.search}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-gray-900 outline-none"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear" className="text-gray-400">
                <X className="size-4" />
              </button>
            )}
          </label>

          {!list.length && (
            <p className={`py-8 text-center text-[13px] ${searchError ? "text-[#d9453c]" : "text-gray-500"}`}>
              {isFetching
                ? T.loading
                : searchError
                  ? searchError.response?.data?.message || searchError.message
                  : !customer && debounced.length < 2
                    ? T.hint
                    : T.none}
            </p>
          )}

          {list.map((row) => {
            const key = keyOf(row);
            const pick = picks[key];
            return (
              <div key={key} className={`rounded-lg border p-3 ${pick ? "border-primary bg-primary/5" : "bg-white"}`}>
                <button type="button" onClick={() => toggle(row)} className="flex w-full items-start justify-between gap-3 text-left">
                  <span className="min-w-0">
                    <b className="block text-[15px] leading-tight text-gray-900">{row.productName}</b>
                    {(row.size || row.color) && <span className="block text-[12px] text-gray-500">{[row.size, row.color].filter(Boolean).join(" · ")}</span>}
                    <span className="block break-words text-[12px] text-gray-500">
                      {row.orderNumber} · {new Date(row.date).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" })}
                      {!customer && row.customerName ? ` · ${row.customerName}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[12px] text-gray-600">
                    <span className="block">
                      {T.sold} {row.sold}
                    </span>
                    <span className="block font-semibold text-gray-900">
                      {T.can} {row.returnable}
                    </span>
                    <span className="block">৳{money(row.price)}</span>
                  </span>
                </button>

                {pick && !row.hasImeis && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="space-y-1 text-[12px] text-gray-600">
                      {T.qty}
                      <input
                        type="number"
                        min="0"
                        max={row.returnable}
                        inputMode="numeric"
                        value={pick.qty}
                        onChange={(event) => patch(row, { qty: event.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="space-y-1 text-[12px] text-[#d9453c]">
                      {T.damaged}
                      <input
                        type="number"
                        min="0"
                        max={Number(pick.qty) || 0}
                        inputMode="numeric"
                        disabled={!(Number(pick.qty) > 0)}
                        value={pick.damaged}
                        onChange={(event) => patch(row, { damaged: event.target.value })}
                        className={inputClass}
                      />
                    </label>
                  </div>
                )}

                {pick && row.hasImeis && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.openImeis.map((imei) => {
                      const ticked = pick.imeis.includes(imei);
                      return (
                        <span key={imei} className="flex items-center gap-2 rounded-md border bg-white px-2 py-1.5 font-mono text-[12px]">
                          <label className="flex cursor-pointer items-center gap-1.5">
                            <input type="checkbox" checked={ticked} onChange={() => toggleImei(pick, imei)} />
                            {imei}
                          </label>
                          {ticked && (
                            <label className="flex cursor-pointer items-center gap-1 font-sans text-[#d9453c]">
                              <input type="checkbox" checked={pick.damagedImeis.includes(imei)} onChange={() => toggleDamaged(pick, imei)} />
                              {T.damagedTick}
                            </label>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {lines.length > 0 && (
            <div className="space-y-2 rounded-lg border bg-gray-50 p-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-[12px] text-gray-600">
                  {T.refund}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.refundAmount}
                    placeholder={T.refundHint}
                    onChange={(event) => setForm({ ...form, refundAmount: event.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1 text-[12px] text-gray-600">
                  {T.method}
                  <select value={form.refundMethod} onChange={(event) => setForm({ ...form, refundMethod: event.target.value })} className={inputClass}>
                    {PAYMENT_METHODS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder={T.note} maxLength={300} className={inputClass} />
            </div>
          )}
        </div>

        <div className="space-y-2 border-t bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[13px]">
            <span className="text-gray-600">
              {T.good}: <b className="text-gray-900">{items - broken}</b>
              {broken > 0 && (
                <>
                  {" · "}
                  {T.broken}: <b className="text-[#d9453c]">{broken}</b>
                </>
              )}
            </span>
            <span>
              {T.total}: <b className="text-[16px]">৳{money(total)}</b>
            </span>
          </div>
          <button
            type="button"
            disabled={saving || !lines.length}
            onClick={save}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[16px] font-semibold text-white disabled:opacity-50"
          >
            <RotateCcw className="size-4" /> {saving ? T.saving : T.save}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
