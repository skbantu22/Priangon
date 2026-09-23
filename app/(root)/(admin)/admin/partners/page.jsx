"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus, X, Search } from "lucide-react";
import { showToast } from "@/lib/showToast";

const ROLE_OPTIONS = [
  ["dealer", "Dealer (ডিলার)"],
  ["subDealer", "Sub Dealer (সাব ডিলার)"],
  ["retailer", "Retailer (রিটেইলার)"],
];
const money = (n) => `৳${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const EMPTY = { role: "dealer", business: "", name: "", phone: "", address: "", email: "", password: "" };

function NewPartnerForm({ onClose, onSaved, defaultRole }) {
  const [form, setForm] = useState({ ...EMPTY, role: defaultRole || "dealer" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await axios.post("/api/partners", form);
      if (!data.success) throw new Error(data.message);
      showToast("success", `Login created for ${data.partner.business}`);
      onSaved();
    } catch (err) {
      showToast("error", err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const input = "h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:border-primary";
  return (
    <form onSubmit={submit} className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">New Dealer / Retailer login</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-white/10">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          Type *
          <select value={form.role} onChange={(e) => set("role", e.target.value)} className={input}>
            {ROLE_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Business / Shop name *
          <input required value={form.business} onChange={(e) => set("business", e.target.value)} className={input} placeholder="Ex: Karim Telecom" />
        </label>
        <label className="text-sm">
          Contact person
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className={input} placeholder="Ex: Abdul Karim" />
        </label>
        <label className="text-sm">
          Phone *
          <input required value={form.phone} onChange={(e) => set("phone", e.target.value)} className={input} placeholder="01XXXXXXXXX" inputMode="tel" />
        </label>
        <label className="text-sm md:col-span-2">
          Address
          <input value={form.address} onChange={(e) => set("address", e.target.value)} className={input} />
        </label>
        <label className="text-sm">
          Login email *
          <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={input} />
        </label>
        <label className="text-sm">
          Password *
          <input required minLength={6} value={form.password} onChange={(e) => set("password", e.target.value)} className={input} placeholder="min 6 characters" />
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <button disabled={saving} className="flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
          {saving && <Loader2 className="size-4 animate-spin" />} Create login
        </button>
      </div>
    </form>
  );
}

function Partners() {
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [role, setRole] = useState(params.get("role") || "");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => (await axios.get("/api/partners")).data,
  });

  const q = search.trim().toLowerCase();
  const rows = (data?.partners || []).filter(
    (p) =>
      (!role || p.role === role) &&
      (!q || [p.business, p.name, p.phone, p.email].some((v) => String(v).toLowerCase().includes(q))),
  );
  const totalDue = rows.reduce((s, p) => s + p.due, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dealers &amp; Retailers</h1>
          <p className="text-sm text-muted-foreground">
            They log in to the partner portal, see their own prices and stock, order and download invoices.
          </p>
        </div>
        <button type="button" onClick={() => setAdding(true)} className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:brightness-110">
          <UserPlus className="size-4" /> Add New
        </button>
      </div>

      {adding && (
        <NewPartnerForm
          defaultRole={role}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            queryClient.invalidateQueries({ queryKey: ["partners"] });
            queryClient.invalidateQueries({ queryKey: ["user-roles"] });
          }}
        />
      )}

      <div className="rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          {[["", "All"], ...ROLE_OPTIONS].map(([v, l]) => (
            <button key={v || "all"} type="button" onClick={() => setRole(v)} className={`h-9 rounded-lg px-3 text-sm font-medium ${role === v ? "bg-primary text-white" : "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300"}`}>
              {l.split(" (")[0]}
            </button>
          ))}
          <label className="ml-auto flex h-9 items-center gap-2 rounded-lg border px-3 focus-within:border-primary">
            <Search className="size-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-44 bg-transparent text-sm outline-none" />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-gray-50 text-left text-xs text-muted-foreground dark:bg-white/5">
              <tr>
                <th className="px-4 py-2">Business</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Contact</th>
                <th className="px-4 py-2">Login</th>
                <th className="px-4 py-2 text-right">Invoices</th>
                <th className="px-4 py-2 text-right">Purchased</th>
                <th className="px-4 py-2 text-right">Due</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="py-10 text-center text-muted-foreground"><Loader2 className="mr-2 inline size-4 animate-spin" />Loading...</td></tr>
              )}
              {isError && (
                <tr><td colSpan={7} className="py-10 text-center text-red-500">Could not load partners.</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No partner accounts yet.</td></tr>
              )}
              {rows.map((p) => (
                <tr key={p._id} className="border-t">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{p.business}</p>
                    <p className="text-xs text-muted-foreground">{p.address}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{p.typeLabel}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p>{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.invoices}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(p.spent)}</td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${p.due > 0 ? "text-red-600" : "text-emerald-600"}`}>{money(p.due)}</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t bg-gray-50 font-semibold dark:bg-white/5">
                  <td className="px-4 py-2.5" colSpan={6}>Total due</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-red-600">{money(totalDue)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

export default function PartnersPage() {
  return (
    <Suspense>
      <Partners />
    </Suspense>
  );
}
