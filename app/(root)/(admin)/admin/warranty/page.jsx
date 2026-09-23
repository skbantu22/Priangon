"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { skipOptimize } from "@/lib/imageSrc";
import { useSelector } from "react-redux";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Search,
  Wrench,
  Loader2,
} from "lucide-react";
import { showToast } from "@/lib/showToast";
import { WARRANTY_TYPES, formatWarrantyPeriod } from "@/lib/warranty";

const STATUS = {
  received: ["Received", "bg-blue-50 text-blue-700"],
  sent_to_service: ["Sent to Service", "bg-amber-50 text-amber-700"],
  repaired: ["Repaired", "bg-emerald-50 text-emerald-700"],
  replaced: ["Replaced", "bg-violet-50 text-violet-700"],
  delivered: ["Delivered", "bg-gray-100 text-gray-700"],
  rejected: ["Rejected", "bg-red-50 text-red-700"],
};

const COMMON_ISSUES = [
  "Display / touch problem",
  "Battery drains fast / not charging",
  "Charging port problem",
  "Speaker / mic problem",
  "Camera problem",
  "Network / SIM problem",
  "Auto restart / hang",
  "Not powering on",
];

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

function WarrantyBadge({ unit }) {
  if (unit.none) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
        <ShieldOff className="size-3.5" /> No warranty
      </span>
    );
  }
  return unit.active ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      <ShieldCheck className="size-3.5" /> Active · {unit.daysLeft} days left
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
      <ShieldAlert className="size-3.5" /> Expired
    </span>
  );
}

function ClaimForm({ unit, onDone, onCancel, userName }) {
  const [issue, setIssue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/warranty/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: unit.orderId,
          variantId: unit.variantId,
          imei: unit.imei,
          issue,
          notes,
          receivedBy: userName,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast("success", `Claim ${data.claim.claimNumber} created`);
      onDone();
    } catch (err) {
      showToast("error", err.message || "Could not create claim");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-3 space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3"
    >
      {!unit.active && (
        <p className="text-xs font-medium text-red-600">
          ⚠ Warranty is not active: this will be logged as a paid service.
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {COMMON_ISSUES.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIssue(i)}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              issue === i
                ? "border-primary bg-primary text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-primary/40 dark:border-white/10 dark:bg-card dark:text-gray-300"
            }`}
          >
            {i}
          </button>
        ))}
      </div>
      <input
        value={issue}
        onChange={(e) => setIssue(e.target.value)}
        placeholder="Problem (required)"
        required
        className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary dark:border-white/10 dark:bg-card"
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes: condition, accessories received, customer remarks..."
        rows={2}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-white/10 dark:bg-card"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-lg px-4 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          disabled={saving}
          className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          Receive Claim
        </button>
      </div>
    </form>
  );
}

export default function WarrantyPage() {
  const auth = useSelector((state) => state.authStore.auth);
  const userName = (auth?.data?.user || auth?.user)?.name || "";

  const [query, setQuery] = useState("");
  const [units, setUnits] = useState(null);
  const [searching, setSearching] = useState(false);
  const [claimFor, setClaimFor] = useState(null);

  const [claims, setClaims] = useState([]);
  const [counts, setCounts] = useState({});
  const [statusFilter, setStatusFilter] = useState("");

  const loadClaims = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/warranty/claims${statusFilter ? `?status=${statusFilter}` : ""}`,
      );
      const data = await res.json();
      if (data.success) {
        setClaims(data.claims);
        setCounts(data.counts || {});
      }
    } catch {
      showToast("error", "Could not load claims");
    }
  }, [statusFilter]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const search = async (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 3) {
      showToast("error", "Type at least 3 characters");
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/warranty/lookup?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setUnits(data.units);
      setClaimFor(null);
    } catch (err) {
      showToast("error", err.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/warranty/claims/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast("success", `Status: ${STATUS[status][0]}`);
      loadClaims();
    } catch (err) {
      showToast("error", err.message || "Update failed");
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const openCount = (counts.received || 0) + (counts.sent_to_service || 0);

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShieldCheck className="size-7 text-primary" /> Warranty
          </h1>
          <p className="text-sm text-muted-foreground">
            Check warranty by IMEI / serial, invoice or phone, and track service
            claims.
          </p>
        </div>
        <div className="flex gap-2">
          {[
            ["Open claims", openCount, "text-amber-600"],
            ["Ready to deliver", (counts.repaired || 0) + (counts.replaced || 0), "text-emerald-600"],
            ["Total claims", total, "text-primary"],
          ].map(([label, n, color]) => (
            <div
              key={label}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 dark:border-white/10 dark:bg-card"
            >
              <p className={`text-xl font-bold ${color}`}>{n}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SEARCH */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-card">
        <form onSubmit={search} className="flex gap-2">
          <label className="flex h-11 flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3 focus-within:border-primary dark:border-white/10">
            <Search className="size-4 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Scan IMEI / serial, or type invoice (INV-000012) or phone (01XXXXXXXXX)"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <button
            disabled={searching}
            className="flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {searching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            Check
          </button>
        </form>

        {units && (
          <div className="mt-4 space-y-3">
            {units.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No sold unit found for “{query}”.
              </p>
            )}
            {units.map((u) => (
              <div
                key={u.key}
                className="rounded-xl border border-gray-200 p-3 dark:border-white/10"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                    <Image
                      src={u.image || "/placeholder.png"}
                      alt={u.productName}
                      fill
                      sizes="64px"
                      className="object-contain"
                      unoptimized={skipOptimize(u.image)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{u.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.variantLabel}
                    </p>
                    {u.imei && (
                      <p className="mt-0.5 font-mono text-xs">IMEI/SN: {u.imei}</p>
                    )}
                  </div>
                  <WarrantyBadge unit={u} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                  <p>
                    <span className="text-muted-foreground">Invoice: </span>
                    {u.orderNumber}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Sold: </span>
                    {fmtDate(u.saleDate)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Customer: </span>
                    {u.customerName} {u.phone && `(${u.phone})`}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Warranty: </span>
                    {u.none
                      ? "None"
                      : `${formatWarrantyPeriod(u.warrantyMonths)} ${WARRANTY_TYPES[u.warrantyType] || ""} · till ${fmtDate(u.warrantyExpiry)}`}
                  </p>
                </div>

                {u.claims.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {u.claims.map((c) => (
                      <span
                        key={c._id}
                        className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${STATUS[c.status][1]}`}
                      >
                        {c.claimNumber} · {STATUS[c.status][0]}
                      </span>
                    ))}
                  </div>
                )}

                {claimFor === u.key ? (
                  <ClaimForm
                    unit={u}
                    userName={userName}
                    onCancel={() => setClaimFor(null)}
                    onDone={() => {
                      setClaimFor(null);
                      search();
                      loadClaims();
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setClaimFor(u.key)}
                    className="mt-3 flex h-9 items-center gap-2 rounded-lg bg-primary/10 px-3 text-sm font-semibold text-primary hover:bg-primary/15"
                  >
                    <Wrench className="size-4" /> New Claim
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CLAIMS */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3 dark:border-white/10">
          <h2 className="mr-2 font-semibold">Claims</h2>
          {[["", "All", total], ...Object.entries(STATUS).map(([k, [l]]) => [k, l, counts[k] || 0])].map(
            ([key, label, n]) => (
              <button
                key={key || "all"}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`h-8 rounded-lg px-3 text-xs font-medium ${
                  statusFilter === key
                    ? "bg-primary text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300"
                }`}
              >
                {label} ({n})
              </button>
            ),
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-gray-50 text-left text-xs text-muted-foreground dark:bg-white/5">
              <tr>
                <th className="px-3 py-2">Claim</th>
                <th className="px-3 py-2">Product / IMEI</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Problem</th>
                <th className="px-3 py-2">Warranty</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {claims.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    No claims yet.
                  </td>
                </tr>
              )}
              {claims.map((c) => (
                <tr key={c._id} className="border-t border-gray-100 align-top dark:border-white/10">
                  <td className="px-3 py-2.5">
                    <p className="font-semibold">{c.claimNumber}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(c.createdAt)}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{c.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.variantLabel} {c.imei && <span className="font-mono">· {c.imei}</span>}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    <p>{c.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.phone} · {c.orderNumber}
                    </p>
                  </td>
                  <td className="max-w-56 px-3 py-2.5">
                    <p>{c.issue}</p>
                    {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    {c.underWarranty ? (
                      <span className="text-xs font-semibold text-emerald-600">Covered</span>
                    ) : (
                      <span className="text-xs font-semibold text-red-600">Paid service</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={c.status}
                      onChange={(e) => updateStatus(c._id, e.target.value)}
                      className={`h-8 rounded-lg px-2 text-xs font-semibold outline-none ${STATUS[c.status][1]}`}
                    >
                      {Object.entries(STATUS).map(([k, [l]]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
