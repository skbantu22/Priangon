"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";
import { oneLine } from "@/lib/labels";
import { WAREHOUSE_TILL, posShowroomsQueryOptions, useOpeningStockTill, writePosShowroom } from "@/lib/posProducts";
import { showToast } from "@/lib/showToast";
import { EmptyRow, btn, filterInput, tdClass, thClass } from "@/components/ui/Application/Admin/listKit";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const emptyForm = { name: "", sortOrder: 0, isActive: true };

// Quality / grade list (Original, Copy...). Each showroom keeps its own, like brands.
export default function QualityPage() {
  const { language } = useLanguage();
  const t = (en, bn) => oneLine(en, bn, language);
  const till = useOpeningStockTill();
  const { data: showrooms = [] } = useQuery(posShowroomsQueryOptions());

  const [qualities, setQualities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/quality", { params: { showroomId: till.id } });
      if (data.success) setQualities(data.data);
      else showToast("error", data.message || "Could not load qualities");
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load qualities");
    } finally {
      setLoading(false);
    }
  }, [till.id]);

  useEffect(() => {
    setSearch("");
    setOpen(false);
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (quality) => {
    setEditingId(quality._id);
    setForm({ name: quality.name, sortOrder: quality.sortOrder || 0, isActive: quality.isActive });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      showToast("error", t("Quality name is required", "কোয়ালিটির নাম লাগবে"));
      return;
    }
    setSaving(true);
    try {
      const { data } = editingId
        ? await axios.put(`/api/quality/${editingId}`, form)
        : await axios.post("/api/quality", { ...form, showroomId: till.id });
      if (!data.success) {
        showToast("error", data.message || t("Could not save quality", "কোয়ালিটি সেভ হয়নি"));
        return;
      }
      showToast("success", editingId ? t("Quality updated", "কোয়ালিটি আপডেট হয়েছে") : t("Quality created", "কোয়ালিটি তৈরি হয়েছে"));
      setOpen(false);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || t("Could not save quality", "কোয়ালিটি সেভ হয়নি"));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (quality) => {
    try {
      const { data } = await axios.put(`/api/quality/${quality._id}`, {
        name: quality.name,
        sortOrder: quality.sortOrder || 0,
        isActive: quality.isActive === false,
      });
      if (!data.success) showToast("error", data.message);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || t("Could not update quality", "কোয়ালিটি আপডেট হয়নি"));
    }
  };

  const remove = async (quality) => {
    if (!confirm(t(`Move "${quality.name}" to trash?`, `"${quality.name}" ট্র্যাশে পাঠাবেন?`))) return;
    try {
      const { data } = await axios.delete(`/api/quality/${quality._id}`);
      showToast(data.success ? "success" : "error", data.message);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || t("Could not delete quality", "কোয়ালিটি মুছা যায়নি"));
    }
  };

  const rows = useMemo(
    () => qualities.filter((q) => q.name.toLowerCase().includes(search.trim().toLowerCase())),
    [qualities, search],
  );

  return (
    <div className="rounded-[8px] bg-white p-[24px] shadow-[0_1px_3px_rgba(16,24,40,0.08)] dark:bg-card">
      <div className="mb-[28px] flex flex-wrap items-start justify-between gap-3">
        <h1 className="m-0 text-[22px] font-semibold text-[#212529] dark:text-foreground">{t("Qualities", "কোয়ালিটি")}</h1>
        <button type="button" onClick={openCreate} className={`${btn.primary} !px-[18px] !py-[10px] !text-[14px]`}>
          <Plus size={16} /> {t("Add New Quality", "নতুন কোয়ালিটি")}
        </button>
      </div>

      <div className="mb-[22px] flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Search...", "খুঁজুন...")}
          className={`${filterInput} !h-[48px] !w-[240px] max-w-full`}
        />
        <select
          value={till.id}
          onChange={(event) => writePosShowroom(event.target.value)}
          className={`${filterInput} !h-[48px] !w-[358px] max-w-full`}
        >
          {till.id === WAREHOUSE_TILL && <option value={WAREHOUSE_TILL}>{t("Ware House", "ওয়্যারহাউস")}</option>}
          {showrooms.filter((s) => s.isActive !== false).map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[16px]">
          <thead>
            <tr className="bg-[#1fa463] text-white">
              <th className={`${thClass} !w-[76px] !text-[16px]`}>{t("SL", "ক্রম")}</th>
              <th className={`${thClass} !text-[16px]`}>{t("Quality", "কোয়ালিটি")}</th>
              <th className={`${thClass} !text-[16px]`}>{t("Action", "অ্যাকশন")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={3} className={`${tdClass} py-8 text-center`}>{t("Loading...", "লোড হচ্ছে...")}</td></tr>}
            {!loading && rows.length === 0 && <EmptyRow colSpan={3} title={t("No quality yet", "এখনো কোনো কোয়ালিটি নেই")} />}
            {!loading &&
              rows.map((quality, index) => (
                <tr key={quality._id} className="odd:bg-[#f4f7fa] dark:odd:bg-muted/40">
                  <td className={`${tdClass} !text-[16px]`}>{index + 1}</td>
                  <td className={`${tdClass} !text-[17px]`}>
                    {quality.name}
                    {quality.isActive === false && <span className="ml-2 text-xs text-gray-400">({t("inactive", "বন্ধ")})</span>}
                  </td>
                  <td className={tdClass}>
                    <div className="flex">
                      <button type="button" onClick={() => openEdit(quality)} className="rounded-l-[4px] bg-[#188ae2] px-[14px] py-[8px] text-[14px] font-medium text-white hover:bg-[#1379c7]">
                        {t("Edit", "সম্পাদনা")}
                      </button>
                      <button type="button" onClick={() => toggle(quality)} className="bg-[#f9c851] px-[14px] py-[8px] text-[14px] font-medium text-white hover:bg-[#f0b93a]">
                        {quality.isActive === false ? t("Active", "চালু") : t("Deactive", "বন্ধ")}
                      </button>
                      <button type="button" onClick={() => remove(quality)} className="rounded-r-[4px] bg-[#ff5b5b] px-[14px] py-[8px] text-[14px] font-medium text-white hover:bg-[#f24242]">
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
        <DialogContent className="max-h-[90vh] max-w-[480px] gap-0 overflow-y-auto p-0">
          <DialogHeader className="border-b bg-[#f7f7f7] px-[26px] py-[24px]">
            <DialogTitle className="text-[20px] font-medium">{editingId ? t("Quality Update", "কোয়ালিটি আপডেট") : t("Quality Create", "কোয়ালিটি তৈরি")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-[26px] py-[22px]">
            <label className="block space-y-1 text-[13px] text-[#495057]">
              {t("Quality Name", "কোয়ালিটির নাম")}
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Original" className={filterInput} />
            </label>
            <label className="block space-y-1 text-[13px] text-[#495057]">
              {t("Sort Order", "ক্রম")}
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className={filterInput} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="size-4" />
              {t("Active (show while adding products)", "সক্রিয় (পণ্য যোগের সময় দেখাবে)")}
            </label>
          </div>
          <div className="flex justify-end gap-2 px-[26px] pb-[22px]">
            <button type="button" onClick={save} disabled={saving} className="rounded-[4px] bg-[#10c469] px-[18px] py-[10px] text-[15px] font-medium text-white hover:bg-[#0dab5b] disabled:opacity-60">
              {saving ? t("Saving...", "সেভ হচ্ছে...") : editingId ? t("Update", "আপডেট") : t("Save", "সেভ")}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-[4px] bg-[#ff5b5b] px-[18px] py-[10px] text-[15px] font-medium text-white hover:bg-[#f24242]">
              {t("Close", "বন্ধ")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
