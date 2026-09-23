"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, UserPlus, Users } from "lucide-react";

const GROUP_STYLE = {
  Staff: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
  Partner: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Customer: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
};

const PARTNER_KEYS = ["dealer", "subDealer", "retailer"];

export default function RoleList() {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["user-roles"],
    queryFn: async () => (await axios.get("/api/users/roles")).data,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.roles || []).filter(
      (r) => !q || r.name.toLowerCase().includes(q) || r.access.toLowerCase().includes(q),
    );
  }, [data, search]);
  const shown = rows.slice(0, pageSize);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h1 className="text-xl font-bold">Role List</h1>
            <p className="text-sm text-muted-foreground">
              Who can log in and what each role can open.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/partners" className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">
              <UserPlus className="size-4" /> Add Dealer / Retailer
            </Link>
            <Link href="/admin/users" className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:brightness-110">
              <UserPlus className="size-4" /> Add Staff User
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
          <label className="flex items-center gap-2">
            Show
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-9 rounded-lg border bg-transparent px-2">
              {[10, 25, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            entries
          </label>
          <label className="flex h-9 items-center gap-2 rounded-lg border px-3 focus-within:border-primary">
            <Search className="size-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-48 bg-transparent outline-none" />
          </label>
        </div>

        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-primary text-left text-white">
                <th className="rounded-l-lg px-4 py-2.5">SL</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Access</th>
                <th className="px-4 py-2.5 text-center">Users</th>
                <th className="rounded-r-lg px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    <Loader2 className="mr-2 inline size-4 animate-spin" /> Loading...
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-red-500">Could not load roles.</td>
                </tr>
              )}
              {shown.map((r, i) => (
                <tr key={r.key} className="border-b last:border-b-0">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold">{r.name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${GROUP_STYLE[r.group]}`}>{r.group}</span>
                  </td>
                  <td className="max-w-md px-4 py-3 text-muted-foreground">{r.access}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                      <Users className="size-3.5 text-muted-foreground" /> {r.users}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {PARTNER_KEYS.includes(r.key) ? (
                      <Link href={`/admin/partners?role=${r.key}`} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                        Manage
                      </Link>
                    ) : r.key === "customer" ? (
                      <Link href="/admin/customers" className="rounded-md bg-gray-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700">
                        Customers
                      </Link>
                    ) : (
                      <Link href="/admin/users" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110">
                        Add user
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm text-muted-foreground">
            Showing {shown.length ? 1 : 0} to {shown.length} of {rows.length} entries
          </p>
        </div>
      </div>
    </div>
  );
}
