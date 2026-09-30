"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import slugify from "slugify";
import { Plus } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";
import { oneLine } from "@/lib/labels";
import { useOpeningStockTill } from "@/lib/posProducts";
import { showToast } from "@/lib/showToast";
import {
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

const emptyForm = { categoryId: "", subcategory: "", slug: "" };

export default function SubCategoryPage() {
  const { language } = useLanguage();
  const t = (en, bn) => oneLine(en, bn, language);
  const till = useOpeningStockTill();

  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [subRes, catRes] = await Promise.all([
        axios.get("/api/subcategory", { params: { deleteType: "SD", size: 10000, start: 0 } }),
        axios.get("/api/category", { params: { deleteType: "SD", size: 10000, start: 0 } }),
      ]);
      if (subRes.data.success) setRows(subRes.data.data || []);
      else showToast("error", subRes.data.message || t("Could not load sub categories", "সাব ক্যাটাগরি লোড হয়নি"));
      if (catRes.data.success) setCategories(catRes.data.data || []);
    } catch (error) {
      showToast("error", error.response?.data?.message || t("Could not load sub categories", "সাব ক্যাটাগরি লোড হয়নি"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQ("");
    setCategoryId("");
    setPage(1);
    load();
  }, [language, till.id]);

  const categoryName = (id) => categories.find((cat) => String(cat._id) === String(id))?.name || "—";

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((row) => {
      if (categoryId && String(row.categoryId) !== categoryId) return false;
      if (!needle) return true;
      return `${row.name} ${categoryName(row.categoryId)}`.toLowerCase().includes(needle);
    });
  }, [rows, q, categoryId, categories]);

  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const save = async () => {
    if (!form.categoryId || !form.subcategory.trim()) {
      showToast("error", t("Category and sub category name are required", "ক্যাটাগরি ও সাব ক্যাটাগরির নাম লাগবে"));
      return;
    }
    setSaving(true);
    try {
      const { data } = await axios.post("/api/subcategory/create", {
        categoryId: form.categoryId,
        subcategory: form.subcategory.trim(),
        slug: form.slug.trim() || slugify(form.subcategory, { lower: true, strict: true }),
      });
      if (!data.success) throw new Error(data.message);
      showToast("success", data.message || t("Sub category created", "সাব ক্যাটাগরি তৈরি হয়েছে"));
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || t("Could not save sub category", "সাব ক্যাটাগরি সেভ হয়নি"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <ListCard
        title={t("Sub Category List", "সাব ক্যাটাগরি তালিকা")}
        actions={
          <button
            type="button"
            className={btn.success}
            onClick={() => {
              setForm(emptyForm);
              setOpen(true);
            }}
          >
            <Plus size={14} /> {t("Add New Sub Category", "নতুন সাব ক্যাটাগরি")}
          </button>
        }
      >
        <form className="mb-4 flex flex-wrap items-center gap-2" onSubmit={(event) => event.preventDefault()}>
          <select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setPage(1);
            }}
            className={`${filterInput} !w-48`}
            aria-label={t("Category", "ক্যাটাগরি")}
          >
            <option value="">{t("All Categories", "সব ক্যাটাগরি")}</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
          <input
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
            placeholder={t("Search sub category", "সাব ক্যাটাগরি খুঁজুন")}
            className={`${filterInput} min-w-[220px] flex-1`}
          />
          <button type="submit" className={btn.info}>{t("Search", "খুঁজুন")}</button>
          <button type="button" className={btn.warning} onClick={() => { setQ(""); setCategoryId(""); setPage(1); }}>
            {t("Clear", "মুছুন")}
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className={theadClass}>
                <th className={thClass}>{t("SL", "ক্রম")}</th>
                <th className={thClass}>{t("Sub Category", "সাব ক্যাটাগরি")}</th>
                <th className={thClass}>{t("Category", "ক্যাটাগরি")}</th>
                <th className={thClass}>{t("Slug", "স্লাগ")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className={`${tdClass} py-8 text-center`}>{t("Loading...", "লোড হচ্ছে...")}</td></tr>}
              {!loading && pageRows.length === 0 && (
                <EmptyRow
                  colSpan={4}
                  title={q || categoryId ? t("No sub category matched", "এই খোঁজে কোনো সাব ক্যাটাগরি নেই") : t("No sub category yet", "এখনো কোনো সাব ক্যাটাগরি নেই")}
                />
              )}
              {!loading &&
                pageRows.map((row, index) => (
                  <tr key={row._id} className="hover:bg-[#f5f7f9] dark:hover:bg-muted/50">
                    <td className={tdClass}>{(safePage - 1) * pageSize + index + 1}</td>
                    <td className={`${tdClass} font-medium`}>{row.name}</td>
                    <td className={tdClass}>{categoryName(row.categoryId)}</td>
                    <td className={tdClass}>{row.slug}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={safePage}
          pages={pages}
          from={filtered.length ? (safePage - 1) * pageSize + 1 : 0}
          count={pageRows.length}
          total={filtered.length}
          onPage={setPage}
        />
      </ListCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("New Sub Category", "নতুন সাব ক্যাটাগরি")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block space-y-1 text-[13px] text-[#495057]">
              {t("Category", "ক্যাটাগরি")}
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={filterInput}>
                <option value="">{t("Select category", "ক্যাটাগরি বাছুন")}</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-[13px] text-[#495057]">
              {t("Sub Category Name", "সাব ক্যাটাগরির নাম")}
              <input
                value={form.subcategory}
                onChange={(e) => setForm({
                  ...form,
                  subcategory: e.target.value,
                  slug: slugify(e.target.value, { lower: true, strict: true }),
                })}
                placeholder={t("Enter sub category name", "সাব ক্যাটাগরির নাম লিখুন")}
                className={filterInput}
              />
            </label>
            <label className="block space-y-1 text-[13px] text-[#495057]">
              {t("Slug", "স্লাগ")}
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={filterInput} />
            </label>
          </div>
          <DialogFooter>
            <button type="button" className={btn.secondary} onClick={() => setOpen(false)}>{t("Cancel", "বাতিল")}</button>
            <button type="button" className={btn.success} onClick={save} disabled={saving}>
              {saving ? t("Saving...", "সেভ হচ্ছে...") : t("Save", "সেভ")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
