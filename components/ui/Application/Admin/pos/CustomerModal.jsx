"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Search, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CUSTOMER_TYPES, normalizeCustomerType } from "@/lib/priceTiers";
import { showToast } from "@/lib/showToast";

const isPhone = (s) => /^01\d{9}$/.test(String(s).replace(/[\s-]/g, ""));

const EMPTY_FORM = { name: "", phone: "", address: "", type: "retail" };

const inputClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary dark:border-white/10 dark:bg-transparent";

const TypeBadge = ({ type }) => {
  const t = normalizeCustomerType(type);
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        t === "retail" ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {CUSTOMER_TYPES[t].short}
    </span>
  );
};

// POS customer modal: find a customer, or add / edit one with its type.
// The picked customer's type sets the rate the cart charges (dealer price...).
export default function CustomerModal({ open, onOpenChange, onPick, initialQuery = "" }) {
  const [tab, setTab] = useState("find");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // every open starts on "find", seeded with what was typed in the cart box
  useEffect(() => {
    if (!open) return;
    setTab("find");
    setQuery(initialQuery);
    setForm(EMPTY_FORM);
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open || tab !== "find") return;
    const q = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const url = q.length >= 2 ? `/api/customer/search?q=${encodeURIComponent(q)}` : "/api/customer/search?recent=1";
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        setResults(data.customers || []);
      } catch {
        // aborted or offline: keep the old list
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, tab, query]);

  const pick = (c) => {
    onPick(c);
    onOpenChange(false);
    const type = normalizeCustomerType(c.type);
    if (type !== "retail") showToast("success", `${CUSTOMER_TYPES[type].short} rate applied`);
  };

  const startNew = () => {
    const q = query.trim();
    setForm({ ...EMPTY_FORM, ...(isPhone(q) ? { phone: q } : { name: q }) });
    setTab("form");
  };

  const startEdit = (c) => {
    setForm({ name: c.name || "", phone: c.phone || "", address: c.address || "", type: normalizeCustomerType(c.type) });
    setTab("form");
  };

  const save = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return showToast("error", "Enter the customer's name");
    if (!isPhone(form.phone)) return showToast("error", "Phone must be 01XXXXXXXXX");

    setSaving(true);
    try {
      const res = await fetch("/api/customer/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast("success", data.message);
      pick(data.customer);
    } catch (err) {
      showToast("error", err.message || "Could not save customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Customer</DialogTitle>
          <DialogDescription>
            Dealer, sub dealer and wholesaler customers get their own rate in the cart.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
          {[
            { key: "find", label: "Find customer", icon: Search },
            { key: "form", label: form.phone && tab === "form" ? "Customer details" : "Add new", icon: UserPlus },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => (key === "form" && tab !== "form" ? startNew() : setTab(key))}
              className={`flex h-8 items-center justify-center gap-1.5 rounded-md font-medium ${
                tab === key ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "find" ? (
          <div className="space-y-2">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 focus-within:border-primary dark:border-white/10">
              <Search className="size-4 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or phone number"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              {searching && <Loader2 className="size-4 animate-spin text-gray-400" />}
            </label>

            <p className="text-[11px] text-muted-foreground">
              {query.trim().length >= 2 ? `${results.length} found` : "Recent customers"}
            </p>

            <div className="max-h-72 divide-y overflow-y-auto rounded-lg border">
              {results.length === 0 && !searching && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">No customer found</p>
              )}
              {results.map((c) => (
                <div key={c._id} className="flex items-center gap-2 px-3 py-2 hover:bg-primary/5">
                  <button type="button" onClick={() => pick(c)} className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{c.name}</span>
                      <TypeBadge type={c.type} />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.phone} · {c.totalOrders || 0} orders
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    title="Edit / change type"
                    className="flex size-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-primary dark:hover:bg-white/10"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => pick(c)}
                    className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={startNew}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/50 text-sm font-medium text-primary hover:bg-primary/5"
            >
              <UserPlus className="size-4" />
              {query.trim() ? `Add “${query.trim()}” as new customer` : "Add new customer"}
            </button>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium">
                <span>Name *</span>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Customer / shop name"
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm font-medium">
                <span>Phone *</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="01XXXXXXXXX"
                  inputMode="tel"
                  className={inputClass}
                />
              </label>
            </div>
            <label className="block space-y-1 text-sm font-medium">
              <span>Address</span>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Area, city"
                className={inputClass}
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-sm font-medium">Customer type (sets the price)</span>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CUSTOMER_TYPES).map(([key, t]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, type: key })}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                      form.type === key
                        ? "border-primary bg-primary/10 font-semibold text-primary ring-1 ring-primary"
                        : "border-gray-200 hover:border-primary/50 dark:border-white/10"
                    }`}
                  >
                    {t.label}
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      {key === "retail" ? "Normal sale price" : `${t.short} price from the price list`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTab("find")}
                className="h-10 rounded-lg border px-4 text-sm font-medium hover:bg-muted"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                Save &amp; Select
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
