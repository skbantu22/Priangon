"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";
import { oneLine } from "@/lib/labels";
import { useOpeningStockTill } from "@/lib/posProducts";
import { showToast } from "@/lib/showToast";
import { EmptyRow, btn, tdClass, thClass } from "@/components/ui/Application/Admin/listKit";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShopSelect, field } from "./accountKit";

const empty = { id: "", name: "", branch: "", address: "", phone: "" };

// Banks: the banks a shop deals with; bank, card and cheque accounts pick from here
export default function BankList() {
  const { language } = useLanguage();
  const t = (en, bn) => oneLine(en, bn, language);
  const till = useOpeningStockTill();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["banks", till.id],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const json = await (await fetch(`/api/banks?showroomId=${encodeURIComponent(till.id)}`)).json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["banks"] });

  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return showToast("error", t("Enter the bank name", "ব্যাংকের নাম লিখুন"));

    setSaving(true);
    try {
      const res = await fetch(form.id ? `/api/banks/${form.id}` : "/api/banks", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, showroomId: till.id }),
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

  const remove = async (bank) => {
    if (!confirm(t(`Delete "${bank.name}"?`, `"${bank.name}" মুছবেন?`))) return;
    const res = await fetch(`/api/banks/${bank._id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    showToast(json.success ? "success" : "error", json.message || t("Could not delete", "মোছা যায়নি"));
    refresh();
  };

  return (
    <div className="rounded-[8px] bg-white p-[24px] shadow-[0_1px_3px_rgba(16,24,40,0.08)] dark:bg-card">
      <div className="mb-[24px] flex flex-wrap items-start justify-between gap-3">
        <h1 className="m-0 text-[22px] font-semibold text-[#212529] dark:text-foreground">{t("Banks", "ব্যাংক")}</h1>
        <button
          type="button"
          onClick={() => {
            setForm(empty);
            setOpen(true);
          }}
          className={`${btn.primary} !px-[18px] !py-[10px] !text-[14px]`}
        >
          <Plus size={16} /> {t("Add New Bank", "নতুন ব্যাংক")}
        </button>
      </div>

      <div className="mb-[20px]">
        <ShopSelect />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr className="bg-[#1fa463] text-white">
              <th className={`${thClass} !w-[60px]`}>{t("SL", "ক্রম")}</th>
              <th className={thClass}>{t("Bank", "ব্যাংক")}</th>
              <th className={thClass}>{t("Branch", "শাখা")}</th>
              <th className={thClass}>{t("Phone", "ফোন")}</th>
              <th className={thClass}>{t("Action", "অ্যাকশন")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className={`${tdClass} py-8 text-center`}>{t("Loading...", "লোড হচ্ছে...")}</td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className={`${tdClass} py-8 text-center`}>
                  <button type="button" className="text-[#188ae2] underline" onClick={() => refetch()}>
                    {t("Could not load. Retry", "লোড হয়নি। আবার চেষ্টা করুন")}
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && data.length === 0 && <EmptyRow colSpan={5} title={t("No bank yet", "এখনো কোনো ব্যাংক নেই")} />}
            {data.map((bank, index) => (
              <tr key={bank._id} className="odd:bg-[#f4f7fa] dark:odd:bg-muted/40">
                <td className={tdClass}>{index + 1}</td>
                <td className={`${tdClass} font-medium`}>{bank.name}</td>
                <td className={tdClass}>{bank.branch || "—"}</td>
                <td className={tdClass}>{bank.phone || "—"}</td>
                <td className={tdClass}>
                  <div className="flex">
                    <button
                      type="button"
                      onClick={() => {
                        setForm({ id: bank._id, name: bank.name, branch: bank.branch || "", address: bank.address || "", phone: bank.phone || "" });
                        setOpen(true);
                      }}
                      className="rounded-l-[4px] bg-[#188ae2] px-[14px] py-[8px] text-[14px] font-medium text-white hover:bg-[#1379c7]"
                    >
                      {t("Edit", "সম্পাদনা")}
                    </button>
                    <button type="button" onClick={() => remove(bank)} className="rounded-r-[4px] bg-[#ff5b5b] px-[14px] py-[8px] text-[14px] font-medium text-white hover:bg-[#f24242]">
                      {t("Delete", "মুছুন")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[620px] gap-0 p-0">
          <DialogHeader className="border-b bg-[#f7f7f7] px-[26px] py-[22px]">
            <DialogTitle className="text-[20px] font-medium">{form.id ? t("Bank Update", "ব্যাংক আপডেট") : t("Bank Create", "ব্যাংক তৈরি")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4 px-[26px] py-[22px]">
            {[
              ["name", t("Bank name", "ব্যাংকের নাম"), true],
              ["branch", t("Branch", "শাখা"), false],
              ["phone", t("Phone", "ফোন"), false],
              ["address", t("Address", "ঠিকানা"), false],
            ].map(([key, label, required]) => (
              <label key={key} className="block space-y-1 text-[15px]">
                {label} {required && <span className="text-red-500">*</span>}
                <input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className={field} />
              </label>
            ))}
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
