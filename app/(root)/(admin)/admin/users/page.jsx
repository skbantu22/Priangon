"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Loader2, UserPlus, Store } from "lucide-react";
import { showToast } from "@/lib/showToast";

const STAFF_ROLES = [
  ["cashier", "Cashier", "POS sales and warranty check"],
  ["manager", "Manager", "POS, products, stock, orders and reports"],
  ["admin", "Admin", "Everything, including users and settings"],
];

const EMPTY = { name: "", email: "", password: "", role: "cashier" };

export default function CreateUserPage() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post("/api/users/create", form);
      if (!data.success) throw new Error(data.message);
      showToast("success", `Login created for ${form.name}`);
      setForm(EMPTY);
    } catch (err) {
      showToast("error", err.response?.data?.message || err.message || "Could not create user");
    } finally {
      setLoading(false);
    }
  };

  const input =
    "h-11 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:border-primary";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Create User</h1>
          <p className="text-sm text-muted-foreground">Staff login for the admin panel / POS.</p>
        </div>
        <Link
          href="/admin/partners"
          className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Store className="size-4" /> Dealer / Sub Dealer / Wholesaler login
        </Link>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6">
        <label className="block text-sm font-medium">
          Full name
          <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={`${input} mt-1`} />
        </label>
        <label className="block text-sm font-medium">
          Email (login)
          <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={`${input} mt-1`} />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input required minLength={6} type="password" value={form.password} onChange={(e) => set("password", e.target.value)} className={`${input} mt-1`} placeholder="min 6 characters" />
        </label>

        <div>
          <p className="mb-2 text-sm font-medium">Role</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {STAFF_ROLES.map(([key, label, hint]) => (
              <label
                key={key}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  form.role === key ? "border-primary bg-primary/5" : "hover:bg-accent/50"
                }`}
              >
                <input type="radio" name="role" value={key} checked={form.role === key} onChange={() => set("role", key)} className="mt-1 accent-primary" />
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <button disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Create user
        </button>
      </form>
    </div>
  );
}
