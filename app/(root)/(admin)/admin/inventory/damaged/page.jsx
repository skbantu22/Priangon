"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Search, Send, Trash2 } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { useOpeningStockTill } from "@/lib/posProducts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PAYMENT_METHODS, fmtDate, inputClass, money } from "@/components/ui/Application/Admin/supplier/supplierKit";

const STATES = [
  ["", "All"],
  ["active", "In warranty"],
  ["expired", "Warranty over"],
  ["none", "No warranty noted"],
  ["nosource", "No purchase on record"],
];

const BADGE = {
  active: ["In warranty", "bg-emerald-100 text-emerald-700"],
  expired: ["Warranty over", "bg-red-100 text-red-700"],
  none: ["No warranty noted", "bg-amber-100 text-amber-800"],
  nosource: ["No purchase on record", "bg-slate-100 text-slate-600"],
};

const dayLeft = (until) => Math.ceil((new Date(until).getTime() - Date.now()) / 86_400_000);

/**
 * Damaged Stock: broken units customers brought back, kept apart from the
 * stock that can be sold. Each one shows the supplier it was bought from and
 * until when he stands behind it. From here it goes back to him (a purchase
 * return, which takes it off what we owe) or is written off as a loss.
 */
export default function DamagedStockPage() {
  const till = useOpeningStockTill();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [state, setState] = useState("");
  const [picked, setPicked] = useState({}); // lotId → units
  const [dialog, setDialog] = useState(null); // "send" | "writeoff"
  const [form, setForm] = useState({ returnDate: new Date().toISOString().slice(0, 10), refundAmount: "", refundMethod: "cash", note: "" });
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["damaged-stock", till.id, applied, state],
    staleTime: 0,
    queryFn: async () => {
      const { data: json } = await axios.get("/api/damaged-stock", { params: { showroomId: till.id, q: applied, state } });
      if (!json.success) throw new Error(json.message);
      return json;
    },
  });

  const lots = data?.data || [];
  const summary = data?.summary;

  const chosen = lots.filter((lot) => picked[lot._id]);
  const units = chosen.reduce((sum, lot) => sum + picked[lot._id], 0);
  const worth = chosen.reduce((sum, lot) => sum + picked[lot._id] * lot.unitCost, 0);
  const suppliers = new Set(chosen.map((lot) => lot.supplierId || "none"));
  const lacksSupplier = chosen.some((lot) => lot.state === "nosource");
  const lateOnes = chosen.filter((lot) => lot.state === "expired");

  const toggle = (lot) =>
    setPicked((current) => {
      const next = { ...current };
      if (next[lot._id]) delete next[lot._id];
      else next[lot._id] = lot.left;
      return next;
    });

  const setUnits = (lot, value) =>
    setPicked((current) => ({ ...current, [lot._id]: Math.max(1, Math.min(lot.left, Math.floor(Number(value)) || 1)) }));

  const run = async (kind) => {
    const url = kind === "send" ? "/api/damaged-stock/send" : "/api/damaged-stock/write-off";

    if (kind === "send") {
      if (lacksSupplier) return showToast("error", "Some of these have no purchase on record. Write them off instead.");
      if (Number(form.refundAmount) > 0 && suppliers.size > 1) return showToast("error", "Enter the refund for one supplier at a time");
      if (lateOnes.length && !confirm(`${lateOnes.length} of these are past the supplier's warranty. Send them back anyway?`)) return;
    }

    setSaving(true);
    try {
      const { data: json } = await axios.post(url, {
        items: chosen.map((lot) => ({ lotId: lot._id, qty: picked[lot._id] })),
        returnDate: form.returnDate,
        refundAmount: Number(form.refundAmount) || 0,
        refundMethod: form.refundMethod,
        note: form.note,
      });
      if (!json.success) throw new Error(json.message);

      showToast("success", json.message);
      setPicked({});
      setDialog(null);
      setForm({ ...form, refundAmount: "", note: "" });
      queryClient.invalidateQueries({ queryKey: ["damaged-stock"] });
    } catch (err) {
      showToast("error", err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      <div className="rounded-[8px] bg-white p-4 shadow-sm dark:bg-card">
        <h1 className="m-0 text-[18px] font-semibold">Damaged Stock</h1>
        <p className="m-0 mt-1 text-[13px] text-muted-foreground">
          Broken units customers brought back. They are not in the stock that can be sold. Send them back to the supplier within his warranty, or write them off.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Units", summary?.units ?? 0, ""],
            ["Loss value", `৳ ${money(summary?.loss ?? 0)}`, "text-[#ff5b5b]"],
            ["In warranty", summary?.active ?? 0, "text-emerald-700"],
            ["Warranty over", summary?.expired ?? 0, "text-red-700"],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-md border px-3 py-2">
              <p className="m-0 text-[12px] text-muted-foreground">{label}</p>
              <p className={`m-0 text-[18px] font-semibold ${tone}`}>{value}</p>
            </div>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setApplied(search.trim());
          }}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <label className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-md border bg-white px-3 focus-within:border-primary">
            <Search className="size-4 text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Product, IMEI, customer, supplier, invoice..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <select value={state} onChange={(event) => setState(event.target.value)} className={`${inputClass} !w-auto`}>
            {STATES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </form>
      </div>

      {error && <p className="rounded-[8px] bg-white p-6 text-center text-[#ff5b5b] dark:bg-card">{error.response?.data?.message || error.message}</p>}
      {isLoading && <div className="h-40 animate-pulse rounded-[8px] bg-white dark:bg-card" />}
      {!isLoading && !error && !lots.length && (
        <p className="rounded-[8px] bg-white p-8 text-center text-[14px] text-muted-foreground dark:bg-card">
          Nothing on the damaged shelf. Units a customer returns as damaged show up here.
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {lots.map((lot) => {
          const on = !!picked[lot._id];
          const [label, tone] = BADGE[lot.state];
          return (
            <article key={lot._id} className={`rounded-[8px] border p-3 ${on ? "border-primary bg-primary/5" : "bg-white dark:bg-card"}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={on} onChange={() => toggle(lot)} className="mt-1 size-5 shrink-0" aria-label={`Choose ${lot.productName}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <b className="text-[15px] leading-tight">
                      {lot.productName}
                      {lot.variantLabel ? <span className="font-normal text-muted-foreground"> · {lot.variantLabel}</span> : null}
                    </b>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span>
                  </div>
                  {lot.imei && <p className="m-0 mt-0.5 font-mono text-[12px]">IMEI {lot.imei}</p>}

                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px]">
                    <div>
                      <dt className="text-muted-foreground">Came back</dt>
                      <dd className="m-0">
                        {fmtDate(lot.receivedAt)} · {lot.returnNumber}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Returned by</dt>
                      <dd className="m-0">{lot.customerName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Bought from</dt>
                      <dd className="m-0">{lot.supplierName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Purchase</dt>
                      <dd className="m-0">{lot.purchaseNumber ? `${lot.purchaseNumber} · ${fmtDate(lot.purchaseDate)}` : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Supplier warranty</dt>
                      <dd className="m-0">
                        {lot.warrantyUntil
                          ? `${lot.warrantyMonths} mo · until ${fmtDate(lot.warrantyUntil)} (${dayLeft(lot.warrantyUntil) >= 0 ? `${dayLeft(lot.warrantyUntil)} days left` : `${-dayLeft(lot.warrantyUntil)} days over`})`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Cost</dt>
                      <dd className="m-0">
                        ৳ {money(lot.unitCost)} × {lot.left} = <b>৳ {money(lot.unitCost * lot.left)}</b>
                      </dd>
                    </div>
                  </dl>

                  {on && lot.left > 1 && (
                    <label className="mt-2 flex items-center gap-2 text-[12.5px]">
                      Units to move
                      <input type="number" min="1" max={lot.left} value={picked[lot._id]} onChange={(event) => setUnits(lot, event.target.value)} className={`${inputClass} !h-9 !w-[80px]`} />
                      <span className="text-muted-foreground">of {lot.left}</span>
                    </label>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {chosen.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] dark:bg-background">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-[13px]">
              <b>{units}</b> unit(s) chosen · cost <b>৳ {money(worth)}</b>
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDialog("writeoff")} className="flex h-10 items-center gap-2 rounded-md border border-[#ff5b5b] px-4 text-[14px] font-medium text-[#ff5b5b]">
                <Trash2 className="size-4" /> Write off
              </button>
              <button type="button" onClick={() => setDialog("send")} className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-[14px] font-medium text-white">
                <Send className="size-4" /> Send to supplier
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(next) => !next && setDialog(null)}>
        <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog === "send" ? "Send back to the supplier" : "Write off as a loss"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-[14px]">
            <p className="m-0 text-muted-foreground">
              {units} unit(s), cost ৳ {money(worth)}.{" "}
              {dialog === "send"
                ? "A purchase return is made for each supplier, and ৳ " + money(worth) + " comes off what you owe him."
                : "They leave the damaged shelf and the cost stays as a loss."}
            </p>
            {dialog === "send" && lateOnes.length > 0 && <p className="m-0 rounded bg-red-50 px-3 py-2 text-red-700">{lateOnes.length} of these are past the supplier&apos;s warranty.</p>}
            {dialog === "send" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-[12px] text-muted-foreground">
                  Return date
                  <input type="date" value={form.returnDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setForm({ ...form, returnDate: event.target.value })} className={inputClass} />
                </label>
                <label className="space-y-1 text-[12px] text-muted-foreground">
                  Cash he gave back
                  <input type="number" min="0" step="0.01" value={form.refundAmount} placeholder="0 = off our due" onChange={(event) => setForm({ ...form, refundAmount: event.target.value })} className={inputClass} />
                </label>
                {Number(form.refundAmount) > 0 && (
                  <label className="col-span-2 space-y-1 text-[12px] text-muted-foreground">
                    Received by
                    <select value={form.refundMethod} onChange={(event) => setForm({ ...form, refundMethod: event.target.value })} className={inputClass}>
                      {PAYMENT_METHODS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
            <input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Note" maxLength={300} className={inputClass} />
            <button
              type="button"
              disabled={saving}
              onClick={() => run(dialog)}
              className={`flex h-11 w-full items-center justify-center rounded-md text-[15px] font-semibold text-white disabled:opacity-60 ${dialog === "send" ? "bg-primary" : "bg-[#ff5b5b]"}`}
            >
              {saving ? "Saving..." : dialog === "send" ? "Send to supplier" : "Write off"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
