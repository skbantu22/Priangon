"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Plus } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";
import { oneLine } from "@/lib/labels";
import { useOpeningStockTill } from "@/lib/posProducts";
import { showToast } from "@/lib/showToast";
import {
  ActionMenu,
  EmptyRow,
  ListCard,
  Pagination,
  btn,
  filterInput,
  tdClass,
  thClass,
  theadClass,
} from "@/components/ui/Application/Admin/listKit";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const emptyForm = { name: "", shortName: "", baseValue: 1, isActive: true };

const UnitPage = () => {
  const { language } = useLanguage();
  const t = (en, bn) => oneLine(en, bn, language);
  const till = useOpeningStockTill();

  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadUnits = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/unit");
      if (data.success) setUnits(data.data);
      else showToast("error", data.message || t("Could not load units", "একক লোড হয়নি"));
    } catch (error) {
      showToast("error", error.response?.data?.message || t("Could not load units", "একক লোড হয়নি"));
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    setQ("");
    setPage(1);
    setOpen(false);
    loadUnits();
  }, [loadUnits, till.id]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (unit) => {
    setEditingId(unit._id);
    setForm({
      name: unit.name,
      shortName: unit.shortName,
      baseValue: unit.baseValue || 1,
      isActive: unit.isActive,
    });
    setOpen(true);
  };

  const saveUnit = async () => {
    if (!form.name.trim() || !form.shortName.trim()) {
      showToast("error", t("Unit name and short name are both required", "এককের নাম ও সংক্ষিপ্ত নাম দুটোই লাগবে"));
      return;
    }

    setSaving(true);
    try {
      const { data } = editingId
        ? await axios.put(`/api/unit/update/${editingId}`, form)
        : await axios.post("/api/unit/create", form);

      if (!data.success) {
        showToast("error", data.message || t("Could not save unit", "একক সেভ হয়নি"));
        return;
      }

      showToast("success", editingId ? t("Unit updated", "একক আপডেট হয়েছে") : t("Unit created", "একক তৈরি হয়েছে"));
      setOpen(false);
      loadUnits();
    } catch (error) {
      showToast("error", error.response?.data?.message || t("Could not save unit", "একক সেভ হয়নি"));
    } finally {
      setSaving(false);
    }
  };

  const deleteUnit = async (unit) => {
    if (!confirm(t(`Move "${unit.name}" to trash?`, `"${unit.name}" ট্র্যাশে পাঠাবেন?`))) return;

    try {
      const { data } = await axios.delete(`/api/unit/delete/${unit._id}`);
      if (!data.success) {
        showToast("error", data.message || t("Could not delete unit", "একক মুছা যায়নি"));
        return;
      }
      showToast("success", t("Unit moved to trash", "একক ট্র্যাশে গেছে"));
      loadUnits();
    } catch (error) {
      showToast("error", error.response?.data?.message || t("Could not delete unit", "একক মুছা যায়নি"));
    }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return units;
    return units.filter((unit) => `${unit.name} ${unit.shortName}`.toLowerCase().includes(needle));
  }, [units, q]);

  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-4">
      <ListCard
        title={t("Unit List", "এককের তালিকা")}
        actions={
          <button type="button" className={btn.success} onClick={openCreate}>
            <Plus size={14} /> {t("Add New Unit", "নতুন একক")}
          </button>
        }
      >
        <form
          className="mb-4 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
          }}
        >
          <input
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
            placeholder={t("Search unit", "একক খুঁজুন")}
            className={`${filterInput} min-w-[220px] flex-1`}
          />
          <button type="submit" className={btn.info}>{t("Search", "খুঁজুন")}</button>
          <button
            type="button"
            className={btn.warning}
            onClick={() => {
              setQ("");
              setPage(1);
            }}
          >
            {t("Clear", "মুছুন")}
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className={theadClass}>
                {[
                  ["SL", "ক্রম"],
                  ["Unit", "একক"],
                  ["Short Name", "সংক্ষিপ্ত নাম"],
                  ["Base Value", "বেস মান"],
                  ["Status", "অবস্থা"],
                  ["Action", "অ্যাকশন"],
                ].map(([en, bn]) => (
                  <th key={en} className={thClass}>{t(en, bn)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className={`${tdClass} py-8 text-center`}>{t("Loading...", "লোড হচ্ছে...")}</td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <EmptyRow
                  colSpan={6}
                  title={q ? t("No unit matched your search", "এই খোঁজে কোনো একক নেই") : t("No unit yet", "এখনো কোনো একক নেই")}
                  hint={t("Add Pcs, Box, Set — whatever you sell by.", "Pcs, Box, Set যোগ করুন — যে এককে বিক্রি করেন।")}
                />
              )}
              {!loading &&
                rows.map((unit, index) => (
                  <tr key={unit._id} className="hover:bg-[#f5f7f9] dark:hover:bg-muted/50">
                    <td className={tdClass}>{(safePage - 1) * pageSize + index + 1}</td>
                    <td className={`${tdClass} font-medium`}>{unit.name}</td>
                    <td className={tdClass}>{unit.shortName}</td>
                    <td className={tdClass}>{unit.baseValue}</td>
                    <td className={tdClass}>
                      <span className={`rounded px-2 py-0.5 text-[12px] font-semibold ${unit.isActive ? "bg-[#e7f8ef] text-[#0e8a4a]" : "bg-[#f1f3f5] text-[#868e96]"}`}>
                        {unit.isActive ? t("Active", "সক্রিয়") : t("Inactive", "নিষ্ক্রিয়")}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <ActionMenu
                        label={t("Action", "অ্যাকশন")}
                        items={[
                          [t("Edit", "সম্পাদনা"), () => openEdit(unit)],
                          [t("Delete", "মুছুন"), () => deleteUnit(unit), "danger"],
                        ]}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={safePage}
          pages={pages}
          from={filtered.length ? (safePage - 1) * pageSize + 1 : 0}
          count={rows.length}
          total={filtered.length}
          onPage={setPage}
        />
      </ListCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t("Edit Unit", "একক সম্পাদনা") : t("New Unit", "নতুন একক")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block space-y-1 text-[13px] text-[#495057]">
              {t("Unit Name", "এককের নাম")}
              <input id="unit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Piece" className={filterInput} />
            </label>
            <label className="block space-y-1 text-[13px] text-[#495057]">
              {t("Short Name", "সংক্ষিপ্ত নাম")}
              <input id="unit-short" value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} placeholder="Pcs" className={filterInput} />
            </label>
            <label className="block space-y-1 text-[13px] text-[#495057]">
              {t("Base Value", "বেস মান")}
              <input id="unit-base" type="number" min={1} value={form.baseValue} onChange={(e) => setForm({ ...form, baseValue: e.target.value })} className={filterInput} />
              <span className="block text-[12px] text-[#98a6ad]">{t("How many base units this holds. 1 Box = 12 Pcs → base value 12.", "একটিতে কত বেস ইউনিট। ১ বক্স = ১২ পিস → বেস মান ১২।")}</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="size-4" />
              {t("Active (show while adding products)", "সক্রিয় (পণ্য যোগের সময় দেখাবে)")}
            </label>
          </div>
          <DialogFooter>
            <button type="button" className={btn.secondary} onClick={() => setOpen(false)}>{t("Cancel", "বাতিল")}</button>
            <button type="button" className={btn.success} onClick={saveUnit} disabled={saving}>
              {saving ? t("Saving...", "সেভ হচ্ছে...") : editingId ? t("Update", "আপডেট") : t("Save", "সেভ")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnitPage;
