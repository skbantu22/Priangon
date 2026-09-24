"use client";

import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Phone,
  Search,
  UserPlus,
  Users,
} from "lucide-react";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";
import { CUSTOMER_TYPES, normalizeCustomerType } from "@/lib/priceTiers";
import { showToast } from "@/lib/showToast";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: "", label: "Customers" },
];

const money = (n) => `৳${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const TYPE_STYLE = {
  retail: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200",
  dealer: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
  subDealer: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
  wholesaler: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
};

const TypeBadge = ({ type }) => {
  const t = normalizeCustomerType(type);
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_STYLE[t]}`}>
      {CUSTOMER_TYPES[t].short}
    </span>
  );
};

const initials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

const dateText = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const WhatsAppIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12.05 21.5a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.56.93.95-3.47-.22-.36A9.41 9.41 0 1 1 12.05 21.5m8.02-17.44A11.33 11.33 0 0 0 1.24 17.74L.62 23.25l5.64-1.48A11.33 11.33 0 0 0 20.07 4.06M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49 2.48 1.07 2.99.86 3.53.8.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35" />
  </svg>
);

const ContactButtons = ({ phone }) =>
  phone ? (
    <span className="flex gap-1">
      <a
        href={`tel:${phone}`}
        title="Call"
        className="flex size-7 items-center justify-center rounded-md text-primary hover:bg-primary/10"
      >
        <Phone className="size-3.5" />
      </a>
      <a
        href={`https://wa.me/88${phone.replace(/^\+?88/, "")}`}
        target="_blank"
        rel="noopener noreferrer"
        title="WhatsApp"
        className="flex size-7 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
      >
        <WhatsAppIcon className="size-3.5" />
      </a>
    </span>
  ) : null;

// ---------------------------------------------------------------------------
// add / edit (saved by phone: the same phone updates that customer)

const EMPTY = { name: "", phone: "", address: "", type: "retail" };
const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-gray-50 disabled:text-gray-500 dark:border-white/15 dark:bg-white/5";

function CustomerForm({ open, onOpenChange, customer, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loadedFor, setLoadedFor] = useState(null);

  // fill the form each time the dialog opens for a (different) customer
  const key = open ? customer?._id || "new" : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    if (open) {
      setForm(
        customer
          ? { name: customer.name, phone: customer.phone, address: customer.address, type: normalizeCustomerType(customer.type) }
          : EMPTY,
      );
    }
  }

  const save = async (e) => {
    e.preventDefault();
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
      onSaved();
      onOpenChange(false);
    } catch (err) {
      showToast("error", err.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{customer ? "Edit customer" : "Add customer"}</DialogTitle>
          <DialogDescription>The customer type sets which price they pay in the POS.</DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-3">
          <label className="block space-y-1 text-sm font-medium">
            <span>Name *</span>
            <input
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              placeholder="Customer / shop name"
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            <span>Phone *</span>
            <input
              required
              value={form.phone}
              disabled={!!customer}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
              placeholder="01XXXXXXXXX"
              inputMode="tel"
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            <span>Address</span>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={inputClass}
              placeholder="Area, city"
            />
          </label>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Customer type</span>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CUSTOMER_TYPES).map(([k, t]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setForm({ ...form, type: k })}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${
                    form.type === k
                      ? "border-primary bg-primary/10 font-semibold text-primary ring-1 ring-primary"
                      : "border-gray-200 hover:border-primary/50 dark:border-white/15"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, customer = edit
  const limit = 20;

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["customer-list", search, type, sort, page],
    queryFn: async () => {
      const params = new URLSearchParams({ q: search, type, sort, page, limit });
      const res = await fetch(`/api/customer/list?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Could not load customers");
      return json;
    },
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const total = data?.total || 0;
  const counts = data?.counts || {};
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const pages = Math.max(1, Math.ceil(total / limit));

  const tabs = [["", "All", allCount], ...Object.entries(CUSTOMER_TYPES).map(([k, t]) => [k, t.short, counts[k] || 0])];

  const submitSearch = (e) => {
    e.preventDefault();
    setSearch(q.trim());
    setPage(1);
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["customer-list"] });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <BreadCrumb breadcrumbData={breadcrumbData} />
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Users className="size-6 text-primary" /> Customers
          </h1>
        </div>
        <Button onClick={() => setEditing({})}>
          <UserPlus className="size-4" /> Add Customer
        </Button>
      </div>

      {/* filters */}
      <div className="space-y-3 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {tabs.map(([k, label, n]) => (
            <button
              key={k || "all"}
              type="button"
              onClick={() => {
                setType(k);
                setPage(1);
              }}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                type === k
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 text-[11px] ${type === k ? "bg-white/20" : "bg-background"}`}>{n}</span>
            </button>
          ))}
        </div>

        <form onSubmit={submitSearch} className="flex flex-wrap gap-2">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 focus-within:border-primary dark:border-white/15 dark:bg-white/5">
            <Search className="size-4 shrink-0 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, phone or address"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none dark:border-white/15 dark:bg-card"
          >
            <option value="recent">Recently active</option>
            <option value="name">Name A–Z</option>
            <option value="spent">Most bought</option>
            <option value="orders">Most orders</option>
          </select>
          <Button type="submit" className="h-10">
            Search
          </Button>
        </form>
      </div>

      {/* list */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <p className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Loading customers...
          </p>
        ) : isError ? (
          <div className="py-16 text-center">
            <p className="text-red-600">Could not load customers.</p>
            <Button variant="link" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : !items.length ? (
          <p className="py-16 text-center text-muted-foreground">No customers found</p>
        ) : (
          <>
            {/* desktop / tablet */}
            <table className="hidden w-full text-sm md:table">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 text-right font-semibold">Orders</th>
                  <th className="px-4 py-3 text-right font-semibold">Total bought</th>
                  <th className="px-4 py-3 text-right font-semibold">Due</th>
                  <th className="hidden px-4 py-3 font-semibold lg:table-cell">Last purchase</th>
                  <th className="w-12 px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((c) => (
                  <tr key={c._id} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {initials(c.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.name}</p>
                          {c.address && <p className="truncate text-xs text-muted-foreground">{c.address}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="tabular-nums">{c.phone || "—"}</span>
                        <ContactButtons phone={c.phone} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <TypeBadge type={c.type} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{c.totalOrders}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">{money(c.totalSpent)}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${c.due > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                      {c.due > 0 ? money(c.due) : "—"}
                    </td>
                    <td className="hidden px-4 py-2.5 text-muted-foreground lg:table-cell">{dateText(c.lastPurchase)}</td>
                    <td className="px-2 py-2.5">
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        title="Edit"
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
                      >
                        <Pencil className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* phones */}
            <ul className="divide-y md:hidden">
              {items.map((c) => (
                <li key={c._id} className="flex items-start gap-3 p-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {initials(c.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{c.name}</p>
                      <TypeBadge type={c.type} />
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <span className="tabular-nums">{c.phone}</span>
                      <ContactButtons phone={c.phone} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.totalOrders} orders · {money(c.totalSpent)}
                      {c.due > 0 && <span className="font-semibold text-red-600"> · Due {money(c.due)}</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                    aria-label="Edit"
                  >
                    <Pencil className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            {isFetching && !isLoading && <Loader2 className="mr-1 inline size-3.5 animate-spin" />}
            {total} customers
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
              <ChevronLeft className="size-4" /> Prev
            </Button>
            <span className="tabular-nums">
              {page} / {pages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((n) => n + 1)}>
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <CustomerForm
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        customer={editing?._id ? editing : null}
        onSaved={refresh}
      />
    </div>
  );
}
