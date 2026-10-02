"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useLanguage } from "@/hooks/useLanguage";
import { oneLine } from "@/lib/labels";
import { EmptyRow, btn, tdClass, thClass } from "@/components/ui/Application/Admin/listKit";
import { ShopSelect, dateText, field, fmt, useAccounts } from "./accountKit";

const SOURCE = {
  deposit: ["Deposit", "জমা"],
  withdraw: ["Withdraw", "উত্তোলন"],
  transfer_in: ["Transfer in", "ট্রান্সফার জমা"],
  transfer_out: ["Transfer out", "ট্রান্সফার খরচ"],
  sale: ["Sale", "বিক্রি"],
  purchase: ["Purchase", "ক্রয়"],
  customer_payment: ["Customer payment", "কাস্টমার পেমেন্ট"],
  supplier_payment: ["Supplier payment", "সাপ্লায়ার পেমেন্ট"],
  expense: ["Expense", "খরচ"],
  telekhata: ["Telekhata", "টেলিখাতা"],
};

// Account Statements
export default function AccountStatement({ initialId = "" }) {
  const { language } = useLanguage();
  const t = (en, bn) => oneLine(en, bn, language);
  const { till, accounts } = useAccounts();

  // the Ledger button of Account List sends the account in the address
  const [pick, setId] = useState(initialId);
  const id = accounts.some((account) => account._id === pick) ? pick : accounts[0]?._id || "";
  const [range, setRange] = useState({ start: "", end: "" });
  const [applied, setApplied] = useState({ start: "", end: "" });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["account-ledger", till.id, id, applied.start, applied.end],
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const qs = new URLSearchParams({ id, showroomId: till.id, start: applied.start, end: applied.end });
      const json = await (await fetch(`/api/accounts/ledger?${qs}`)).json();
      if (!json.success) throw new Error(json.message);
      return json;
    },
  });

  return (
    <div className="rounded-[8px] bg-white p-[24px] shadow-[0_1px_3px_rgba(16,24,40,0.08)] dark:bg-card">
      <div className="mb-[20px] flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-[22px] font-semibold text-[#212529] dark:text-foreground">{t("Account Statements", "অ্যাকাউন্ট স্টেটমেন্ট")}</h1>
        <ShopSelect />
      </div>

      <form
        className="mb-[20px] grid grid-cols-1 items-end gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied(range);
        }}
      >
        <label className="space-y-1 text-[14px]">
          {t("Account", "অ্যাকাউন্ট")}
          <select value={id} onChange={(event) => setId(event.target.value)} className={field}>
            {accounts.map((account) => (
              <option key={account._id} value={account._id}>{account.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-[14px]">
          {t("From", "থেকে")}
          <input type="date" value={range.start} onChange={(event) => setRange({ ...range, start: event.target.value })} className={field} />
        </label>
        <label className="space-y-1 text-[14px]">
          {t("To", "পর্যন্ত")}
          <input type="date" value={range.end} onChange={(event) => setRange({ ...range, end: event.target.value })} className={field} />
        </label>
        <button type="submit" className={`${btn.info} !h-[44px]`}>{t("Search", "খুঁজুন")}</button>
      </form>

      {data && (
        <div className="mb-[16px] grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [t("Opening", "শুরুতে"), data.summary.opening, ""],
            [t("Money in", "জমা"), data.summary.moneyIn, "text-[#10a85a]"],
            [t("Money out", "খরচ"), data.summary.moneyOut, "text-[#e24848]"],
            [t("Balance", "ব্যালেন্স"), data.summary.balance, "font-bold"],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-lg bg-[#f6f8fa] p-3 text-center dark:bg-muted/40">
              <p className="m-0 text-[13px] text-muted-foreground">{label}</p>
              <p className={`m-0 text-[17px] ${tone}`}>{fmt(value)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr className="bg-[#1fa463] text-white">
              <th className={thClass}>{t("Date", "তারিখ")}</th>
              <th className={thClass}>{t("Type", "ধরন")}</th>
              <th className={thClass}>{t("Note", "নোট")}</th>
              <th className={`${thClass} !text-right`}>{t("In", "জমা")}</th>
              <th className={`${thClass} !text-right`}>{t("Out", "খরচ")}</th>
              <th className={`${thClass} !text-right`}>{t("Balance", "ব্যালেন্স")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className={`${tdClass} py-8 text-center`}>{t("Loading...", "লোড হচ্ছে...")}</td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className={`${tdClass} py-8 text-center`}>
                  <button type="button" className="text-[#188ae2] underline" onClick={() => refetch()}>
                    {t("Could not load. Retry", "লোড হয়নি। আবার চেষ্টা করুন")}
                  </button>
                </td>
              </tr>
            )}
            {data && data.rows.length === 0 && <EmptyRow colSpan={6} title={t("No entry yet", "এখনো কোনো এন্ট্রি নেই")} />}
            {(data?.rows || []).map((row) => (
              <tr key={row._id} className="odd:bg-[#f4f7fa] dark:odd:bg-muted/40">
                <td className={tdClass}>{dateText(row.date)}</td>
                <td className={tdClass}>{SOURCE[row.source] ? t(...SOURCE[row.source]) : row.source}</td>
                <td className={tdClass}>{[row.reference, row.note].filter(Boolean).join(" · ") || "—"}</td>
                <td className={`${tdClass} text-right text-[#10a85a]`}>{row.direction === "in" ? fmt(row.amount) : ""}</td>
                <td className={`${tdClass} text-right text-[#e24848]`}>{row.direction === "out" ? fmt(row.amount) : ""}</td>
                <td className={`${tdClass} text-right font-semibold`}>{fmt(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
