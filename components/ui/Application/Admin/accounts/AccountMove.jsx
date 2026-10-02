"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";
import { oneLine } from "@/lib/labels";
import { showToast } from "@/lib/showToast";
import { EmptyRow, tdClass, thClass } from "@/components/ui/Application/Admin/listKit";
import { ShopSelect, dateText, field, fmt, today, useAccounts } from "./accountKit";

// Deposit/Withdraw (mode="cash") and Balance Transfer (mode="transfer"): a form and the list under it
export default function AccountMove({ mode = "cash" }) {
  const { language } = useLanguage();
  const t = (en, bn) => oneLine(en, bn, language);
  const queryClient = useQueryClient();
  const { till, accounts } = useAccounts();
  const transfer = mode === "transfer";

  const [form, setForm] = useState({ kind: "deposit", accountId: "", toAccountId: "", amount: "", note: "", date: today() });
  const [saving, setSaving] = useState(false);

  const list = useQuery({
    queryKey: ["account-moves", till.id, mode],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const qs = new URLSearchParams({ showroomId: till.id, kind: transfer ? "transfer" : "cash" });
      const json = await (await fetch(`/api/accounts/move?${qs}`)).json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    },
  });

  const active = accounts.filter((account) => account.isActive !== false);
  const from = active.find((account) => account._id === form.accountId);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["account-moves"] });
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/accounts/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, kind: transfer ? "transfer" : form.kind, showroomId: till.id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      showToast("success", json.message);
      setForm({ ...form, amount: "", note: "" });
      refresh();
    } catch (error) {
      showToast("error", error.message || t("Could not save", "সেভ হয়নি"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!confirm(t("Remove this entry?", "এই এন্ট্রি মুছবেন?"))) return;
    const res = await fetch(`/api/accounts/move?id=${row._id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    showToast(json.success ? "success" : "error", json.message || t("Could not remove", "মোছা যায়নি"));
    refresh();
  };

  return (
    <div className="rounded-[8px] bg-white p-[24px] shadow-[0_1px_3px_rgba(16,24,40,0.08)] dark:bg-card">
      <div className="mb-[20px] flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-[22px] font-semibold text-[#212529] dark:text-foreground">
          {transfer ? t("Balance Transfer", "ব্যালেন্স ট্রান্সফার") : t("Deposit / Withdraw", "জমা / উত্তোলন")}
        </h1>
        <ShopSelect />
      </div>

      <form onSubmit={save} className="mb-[26px] grid grid-cols-1 gap-4 rounded-lg bg-[#f6f8fa] p-4 sm:grid-cols-2 dark:bg-muted/40">
        {!transfer && (
          <div className="flex gap-2 sm:col-span-2">
            {[
              ["deposit", t("Deposit", "জমা")],
              ["withdraw", t("Withdraw", "উত্তোলন")],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm({ ...form, kind: key })}
                className={`h-10 flex-1 rounded-lg border text-[15px] font-semibold ${form.kind === key ? (key === "deposit" ? "border-[#10c469] bg-[#10c469] text-white" : "border-[#ff5b5b] bg-[#ff5b5b] text-white") : "bg-white"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <label className="space-y-1 text-[14px]">
          {transfer ? t("From account", "যে অ্যাকাউন্ট থেকে") : t("Account", "অ্যাকাউন্ট")} <span className="text-red-500">*</span>
          <select required value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })} className={field}>
            <option value="">{t("Select", "সিলেক্ট")}</option>
            {active.map((account) => (
              <option key={account._id} value={account._id}>
                {account.name} ({fmt(account.balance)})
              </option>
            ))}
          </select>
        </label>

        {transfer && (
          <label className="space-y-1 text-[14px]">
            {t("To account", "যে অ্যাকাউন্টে")} <span className="text-red-500">*</span>
            <select required value={form.toAccountId} onChange={(event) => setForm({ ...form, toAccountId: event.target.value })} className={field}>
              <option value="">{t("Select", "সিলেক্ট")}</option>
              {active
                .filter((account) => account._id !== form.accountId)
                .map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.name} ({fmt(account.balance)})
                  </option>
                ))}
            </select>
          </label>
        )}

        <label className="space-y-1 text-[14px]">
          {t("Amount", "পরিমাণ")} <span className="text-red-500">*</span>
          <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className={field} />
          {from && (transfer || form.kind === "withdraw") && (
            <span className="block text-[12px] text-muted-foreground">
              {t("Available", "আছে")}: {fmt(from.balance)}
            </span>
          )}
        </label>

        <label className="space-y-1 text-[14px]">
          {t("Date", "তারিখ")}
          <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className={field} />
        </label>

        <label className="space-y-1 text-[14px] sm:col-span-2">
          {t("Note", "নোট")}
          <input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} maxLength={300} className={field} />
        </label>

        <div className="sm:col-span-2">
          <button type="submit" disabled={saving} className="rounded-[4px] bg-[#10c469] px-[22px] py-[10px] text-[15px] font-medium text-white hover:bg-[#0dab5b] disabled:opacity-60">
            {saving ? t("Saving...", "সেভ হচ্ছে...") : t("Submit", "সাবমিট")}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr className="bg-[#1fa463] text-white">
              <th className={thClass}>{t("Date", "তারিখ")}</th>
              <th className={thClass}>{transfer ? t("From", "থেকে") : t("Account", "অ্যাকাউন্ট")}</th>
              {transfer ? <th className={thClass}>{t("To", "তে")}</th> : <th className={thClass}>{t("Type", "ধরন")}</th>}
              <th className={`${thClass} !text-right`}>{t("Amount", "পরিমাণ")}</th>
              <th className={thClass}>{t("Note", "নোট")}</th>
              <th className={`${thClass} !w-[50px]`} />
            </tr>
          </thead>
          <tbody>
            {list.isLoading && (
              <tr>
                <td colSpan={6} className={`${tdClass} py-8 text-center`}>{t("Loading...", "লোড হচ্ছে...")}</td>
              </tr>
            )}
            {!list.isLoading && (list.data || []).length === 0 && <EmptyRow colSpan={6} title={t("Nothing yet", "এখনো কিছু নেই")} />}
            {(list.data || []).map((row) => (
              <tr key={row._id} className="odd:bg-[#f4f7fa] dark:odd:bg-muted/40">
                <td className={tdClass}>{dateText(row.date)}</td>
                <td className={tdClass}>{row.account}</td>
                {transfer ? (
                  <td className={tdClass}>{row.toAccount || "—"}</td>
                ) : (
                  <td className={`${tdClass} font-medium ${row.source === "deposit" ? "text-[#10a85a]" : "text-[#e24848]"}`}>
                    {row.source === "deposit" ? t("Deposit", "জমা") : t("Withdraw", "উত্তোলন")}
                  </td>
                )}
                <td className={`${tdClass} text-right font-semibold`}>{fmt(row.amount)}</td>
                <td className={tdClass}>{row.note || "—"}</td>
                <td className={tdClass}>
                  <button type="button" onClick={() => remove(row)} className="text-[#999] hover:text-red-500" aria-label="Remove">
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
