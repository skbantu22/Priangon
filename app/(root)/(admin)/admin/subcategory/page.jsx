"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import slugify from "slugify";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";
import { oneLine } from "@/lib/labels";
import {
  WAREHOUSE_TILL,
  posShowroomsQueryOptions,
  useOpeningStockTill,
  writePosShowroom,
} from "@/lib/posProducts";
import { showToast } from "@/lib/showToast";
import {
  EmptyRow,
  Pagination,
  btn,
  filterInput,
  tdClass,
  thClass,
} from "@/components/ui/Application/Admin/listKit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const emptyForm = { id: "", categoryId: "", name: "" };

export default function SubCategoryPage() {
  const { language } = useLanguage();
  const t = (en, bn) => oneLine(en, bn, language);
  const till = useOpeningStockTill();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: showrooms = [] } = useQuery(posShowroomsQueryOptions());

  // The selected showroom's own categories, and the sub categories under them
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-subcategories", till.id],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const [subRes, catRes] = await Promise.all([
        axios.get("/api/subcategory", { params: { deleteType: "SD", size: 10000, start: 0 } }),
        axios.get("/api/category", {
          params: { deleteType: "SD", size: 10000, start: 0, showroomId: till.id },
        }),
      ]);
      if (!subRes.data.success) throw new Error(subRes.data.message || "Could not load sub categories");
      const categories = catRes.data?.data || [];
      const own = new Set(categories.map((cat) => String(cat._id)));
      const rows = (subRes.data.data || []).filter((row) => own.has(String(row.categoryId)));
      return { rows, categories };
    },
  });
  const rows = data?.rows || [];
  const categories = data?.categories || [];

  useEffect(() => {
    setPage(1);
  }, [till.id]);

  const categoryName = (id) => categories.find((cat) => String(cat._id) === String(id))?.name || "—";

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pages);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-subcategories"] });

  const openCreate = () => {
    setForm({ ...emptyForm, categoryId: categories.find((cat) => cat.isActive !== false)?._id || "" });
    setOpen(true);
  };

  const openEdit = (row) => {
    setForm({ id: row._id, categoryId: String(row.categoryId), name: row.name });
    setOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!form.categoryId || !name) return;
    setSaving(true);
    try {
      const { data: res } = form.id
        ? await axios.put("/api/subcategory/manage", {
            action: "update",
            id: form.id,
            categoryId: form.categoryId,
            name,
          })
        : await axios.post("/api/subcategory/create", {
            categoryId: form.categoryId,
            subcategory: name,
            slug: slugify(name, { lower: true, strict: true }),
          });
      if (!res.success) throw new Error(res.message);
      showToast("success", res.message);
      setOpen(false);
      refresh();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || t("Could not save sub category", "সাব ক্যাটাগরি সেভ হয়নি"));
    } finally {
      setSaving(false);
    }
  };

  const act = async (payload, confirmText) => {
    if (confirmText && !confirm(confirmText)) return;
    try {
      const { data: res } = await axios.put("/api/subcategory/manage", payload);
      showToast(res.success ? "success" : "error", res.message);
      refresh();
    } catch (error) {
      showToast("error", error.response?.data?.message || t("Could not update sub category", "সাব ক্যাটাগরি আপডেট হয়নি"));
    }
  };

  return (
    <div className="rounded-[8px] bg-white p-[24px] shadow-[0_1px_3px_rgba(16,24,40,0.08)] dark:bg-card">
      <div className="mb-[28px] flex flex-wrap items-start justify-between gap-3">
        <h1 className="m-0 text-[22px] font-semibold text-[#212529] dark:text-foreground">{t("Sub Categories", "সাব ক্যাটাগরি")}</h1>
        <button type="button" onClick={openCreate} className={`${btn.primary} !px-[18px] !py-[10px] !text-[14px]`}>
          <Plus size={16} /> {t("Add New Sub Category", "নতুন সাব ক্যাটাগরি")}
        </button>
      </div>

      <div className="mb-[22px] flex flex-wrap items-center gap-3">
        <select
          value={pageSize}
          onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
          className={`${filterInput} !h-[48px] !w-[100px]`}
        >
          {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
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
              <th className={`${thClass} !text-[16px]`}>{t("Sub Category Name", "সাব ক্যাটাগরির নাম")}</th>
              <th className={`${thClass} !text-[16px]`}>{t("Category", "ক্যাটাগরি")}</th>
              <th className={`${thClass} !text-[16px]`}>{t("Action", "অ্যাকশন")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4} className={`${tdClass} py-8 text-center`}>{t("Loading...", "লোড হচ্ছে...")}</td></tr>
            )}
            {!isLoading && isError && (
              <tr>
                <td colSpan={4} className={`${tdClass} py-8 text-center`}>
                  <button type="button" className="text-[#188ae2] underline" onClick={() => refetch()}>
                    {t("Could not load sub categories. Retry", "সাব ক্যাটাগরি লোড হয়নি। আবার চেষ্টা করুন")}
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && pageRows.length === 0 && (
              <EmptyRow colSpan={4} title={t("No sub category yet", "এখনো কোনো সাব ক্যাটাগরি নেই")} />
            )}
            {!isLoading &&
              pageRows.map((row, index) => (
                <tr key={row._id} className="odd:bg-[#f4f7fa] dark:odd:bg-muted/40">
                  <td className={`${tdClass} !text-[16px]`}>{(safePage - 1) * pageSize + index + 1}</td>
                  <td className={`${tdClass} !text-[17px]`}>{row.name}</td>
                  <td className={`${tdClass} !text-[16px]`}>{categoryName(row.categoryId)}</td>
                  <td className={tdClass}>
                    <div className="flex">
                      <button type="button" onClick={() => openEdit(row)} className="rounded-l-[4px] bg-[#188ae2] px-[14px] py-[8px] text-[14px] font-medium text-white hover:bg-[#1379c7]">
                        {t("Edit", "সম্পাদনা")}
                      </button>
                      <button
                        type="button"
                        onClick={() => act({ action: "toggle", id: row._id, isActive: row.isActive === false })}
                        className="bg-[#f9c851] px-[14px] py-[8px] text-[14px] font-medium text-white hover:bg-[#f0b93a]"
                      >
                        {row.isActive === false ? t("Active", "চালু") : t("Deactive", "বন্ধ")}
                      </button>
                      <button
                        type="button"
                        onClick={() => act({ action: "delete", id: row._id }, t(`Delete "${row.name}"?`, `"${row.name}" মুছবেন?`))}
                        className="rounded-r-[4px] bg-[#ff5b5b] px-[14px] py-[8px] text-[14px] font-medium text-white hover:bg-[#f24242]"
                      >
                        {t("Delete", "মুছুন")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={safePage}
        pages={pages}
        from={rows.length ? (safePage - 1) * pageSize + 1 : 0}
        count={pageRows.length}
        total={rows.length}
        onPage={setPage}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[620px] gap-0 p-0">
          <DialogHeader className="border-b bg-[#f7f7f7] px-[26px] py-[24px]">
            <DialogTitle className="text-[20px] font-medium">
              {form.id ? t("Subcategory Update", "সাব ক্যাটাগরি আপডেট") : t("Subcategory Create", "সাব ক্যাটাগরি তৈরি")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-5 px-[26px] py-[22px]">
            <label className="block text-[16px] text-[#212529]">
              {t("Category", "ক্যাটাগরি")} <span className="text-[#ff5b5b]">*</span>
              <select
                required
                value={form.categoryId}
                onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                className={`${filterInput} mt-2 !h-[48px]`}
              >
                <option value="" disabled>{t("Select category", "ক্যাটাগরি বাছুন")}</option>
                {categories
                  .filter((cat) => cat.isActive !== false || String(cat._id) === form.categoryId)
                  .map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
              </select>
            </label>
            <label className="block text-[16px] text-[#212529]">
              {t("Name", "নাম")} <span className="text-[#ff5b5b]">*</span>
              <input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder={t("Sub Category", "সাব ক্যাটাগরি")}
                className={`${filterInput} mt-2 !h-[48px]`}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="submit" disabled={saving} className="rounded-[4px] bg-[#10c469] px-[18px] py-[10px] text-[15px] font-medium text-white hover:bg-[#0dab5b] disabled:opacity-60">
                {saving ? t("Saving...", "সেভ হচ্ছে...") : t("Save", "সেভ")}
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
