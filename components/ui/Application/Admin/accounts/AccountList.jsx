"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";
import { oneLine } from "@/lib/labels";
import { showToast } from "@/lib/showToast";
import { EmptyRow, btn, tdClass, thClass } from "@/components/ui/Application/Admin/listKit";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ACCOUNT_TYPE_LIST, ShopSelect, field, fmt, today, typeLabel, useAccounts } from "./accountKit";

const empty = { id: "", type: "mobile_banking", name: "", bankName: "", accountNumber: "", openingBalance: "" };

// Account List + Create Account
export default function AccountList() {
  const { language } = useLanguage();
  const t = (en, bn) => oneLine(en, bn, language);
  const queryClient = useQueryClient();
  const { till, accounts, total, isLoading, isError, refetch } = useAccounts();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const banks = useQuery({
    queryKey: ["banks", till.id],
    enabled: open,
    queryFn: async () => (await (await fetch(`/api/banks?showroomId=${encodeURIComponent(till.id)}`)).json()).data || [],
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["accounts"] });
  const needsBank = ["bank", "card", "cheque"].includes(form.type);

  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return showToast("error", t("Enter the account name", "অ্যাকাউন্টের নাম লিখুন"));

    setSaving(true);
    try {
      const res = await fetch(form.id ? `/api/accounts/${form.id}` : "/api/accounts", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, showroomId: till.id, openingDate: today() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      showToast("success", json.message);
      setOpen(false);
      refresh();
    } catch (error) {
      showToast("error", error.message || t("Could not save", "সেভ হয়নি"));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (account) => {
    const res = await fetch(`/api/accounts/${account._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: account.isActive === false }),
    });
    const json = await res.json().catch(() => ({}));
    showToast(json.success ? "success" : "error", json.message || t("Could not update", "আপডেট হয়নি"));
    refresh();
  };

  const remove = async (account) => {
    if (!confirm(t(`Delete "${account.name}"?`, `"${account.name}" মুছবেন?`))) return;
    const res = await fetch(`/api/accounts/${account._id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    showToast(json.success ? "success" : "error", json.message || t("Could not delete", "মোছা যায়নি"));
    refresh();
  };

  const openCreate = () => {
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (account) => {
    setForm({
      id: account._id,
      type: account.type,
      name: account.name,
      bankName: account.bankName || "",
      accountNumber: account.accountNumber || "",
      openingBalance: String(account.openingBalance || ""),
    });
    setOpen(true);
  };

  return (
    <div className="rounded-[8px] bg-white p-[24px] shadow-[0_1px_3px_rgba(16,24,40,0.08)] dark:bg-card">
      <div className="mb-[24px] flex flex-wrap items-start justify-between gap-3">
        <h1 className="m-0 text-[22px] font-semibold text-[#212529] dark:text-foreground">{t("Account List", "অ্যাকাউন্ট তালিকা")}</h1>
        <button type="button" onClick={openCreate} className={`${btn.primary} !px-[18px] !py-[10px] !text-[14px]`}>
          <Plus size={16} /> {t("Create Account", "নতুন অ্যাকাউন্ট")}
        </button>
      </div>

      <div className="mb-[20px] flex flex-wrap items-center gap-3">
        <ShopSelect />
        <div className="ml-auto rounded-lg bg-[#eef6ff] px-4 py-2 text-[15px] dark:bg-muted">
          {t("All accounts", "সব অ্যাকাউন্ট")} (BDT): <b>{fmt(total)}</b>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr className="bg-[#1fa463] text-white">
              <th className={`${thClass} !w-[60px]`}>{t("SL", "ক্রম")}</th>
              <th className={thClass}>{t("Account", "অ্যাকাউন্ট")}</th>
              <th className={thClass}>{t("Type", "ধরন")}</th>
              <th className={thClass}>{t("Bank / Number", "ব্যাংক / নম্বর")}</th>
              <th className={`${thClass} !text-right`}>{t("Amount (BDT)", "পরিমাণ (BDT)")}</th>
              <th className={thClass}>{t("Action", "অ্যাকশন")}</th>
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
            {!isLoading && !isError && accounts.length === 0 && <EmptyRow colSpan={6} title={t("No account yet", "এখনো কোনো অ্যাকাউন্ট নেই")} />}
            {accounts.map((account, index) => (
              <tr key={account._id} className={`odd:bg-[#f4f7fa] dark:odd:bg-muted/40 ${account.isActive === false ? "opacity-60" : ""}`}>
                <td className={tdClass}>{index + 1}</td>
                <td className={`${tdClass} font-medium`}>
                  {account.name}
                  {account.isActive === false && <span className="ml-2 text-xs text-red-500">({t("Inactive", "বন্ধ")})</span>}
                </td>
                <td className={tdClass}>{typeLabel(account.type, language)}</td>
                <td className={tdClass}>{[account.bankName, account.accountNumber].filter(Boolean).join(" · ") || "—"}</td>
                <td className={`${tdClass} text-right font-semibold`}>{fmt(account.balance)}</td>
                <td className={tdClass}>
                  <div className="flex flex-wrap">
                    <Link href={`/admin/accounts/statement?id=${account._id}`} className="rounded-l-[4px] bg-[#35b8e0] px-[12px] py-[7px] text-[13px] font-medium text-white hover:bg-[#22a6cf]">
                      {t("Ledger", "লেজার")}
                    </Link>
                    <button type="button" onClick={() => openEdit(account)} className="bg-[#188ae2] px-[12px] py-[7px] text-[13px] font-medium text-white hover:bg-[#1379c7]">
                      {t("Edit", "সম্পাদনা")}
                    </button>
                    {account.type !== "cash" && (
                      <>
                        <button type="button" onClick={() => toggle(account)} className="bg-[#f9c851] px-[12px] py-[7px] text-[13px] font-medium text-white hover:bg-[#f0b93a]">
                          {account.isActive === false ? t("Active", "চালু") : t("Deactive", "বন্ধ")}
                        </button>
                        <button type="button" onClick={() => remove(account)} className="rounded-r-[4px] bg-[#ff5b5b] px-[12px] py-[7px] text-[13px] font-medium text-white hover:bg-[#f24242]">
                          {t("Delete", "মুছুন")}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-[620px] gap-0 overflow-y-auto p-0">
          <DialogHeader className="border-b bg-[#f7f7f7] px-[26px] py-[22px]">
            <DialogTitle className="text-[20px] font-medium">{form.id ? t("Account Update", "অ্যাকাউন্ট আপডেট") : t("Add Account", "অ্যাকাউন্ট যোগ")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4 px-[26px] py-[22px]">
            <label className="block space-y-1 text-[15px]">
              {t("Account Type", "অ্যাকাউন্টের ধরন")} <span className="text-red-500">*</span>
              <select value={form.type} disabled={!!form.id} onChange={(event) => setForm({ ...form, type: event.target.value })} className={field}>
                {ACCOUNT_TYPE_LIST.filter(([key]) => key !== "cash" || form.id).map(([key]) => (
                  <option key={key} value={key}>{typeLabel(key, language)}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1 text-[15px]">
              {form.type === "mobile_banking" ? t("Name (bKash, Nagad...)", "নাম (বিকাশ, নগদ...)") : t("Account name", "অ্যাকাউন্টের নাম")} <span className="text-red-500">*</span>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder={form.type === "mobile_banking" ? "bKash" : t("Name", "নাম")}
                className={field}
              />
            </label>

            {needsBank && (
              <label className="block space-y-1 text-[15px]">
                {t("Bank", "ব্যাংক")}
                <select value={form.bankName} onChange={(event) => setForm({ ...form, bankName: event.target.value })} className={field}>
                  <option value="">{t("Select", "সিলেক্ট")}</option>
                  {(banks.data || []).map((bank) => (
                    <option key={bank._id} value={bank.name}>{bank.name}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="block space-y-1 text-[15px]">
              {t("Account / mobile number", "অ্যাকাউন্ট / মোবাইল নম্বর")}
              <input value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} className={field} />
            </label>

            <label className="block space-y-1 text-[15px]">
              {t("Opening balance", "শুরুর ব্যালেন্স")}
              <input type="number" step="0.01" value={form.openingBalance} onChange={(event) => setForm({ ...form, openingBalance: event.target.value })} className={field} />
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button type="submit" disabled={saving} className="rounded-[4px] bg-[#10c469] px-[18px] py-[10px] text-[15px] font-medium text-white hover:bg-[#0dab5b] disabled:opacity-60">
                {saving ? t("Saving...", "সেভ হচ্ছে...") : t("Submit", "সাবমিট")}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-[4px] bg-[#ff5b5b] px-[18px] py-[10px] text-[15px] font-medium text-white hover:bg-[#f24242]">
                {t("Close", "বন্ধ")}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
