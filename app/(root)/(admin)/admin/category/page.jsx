"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import slugify from "slugify";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export default function CategoryPage() {
  const { language } = useLanguage();
  const t = (en, bn) => oneLine(en, bn, language);
  const till = useOpeningStockTill();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [updating, setUpdating] = useState(false);

  const { data: showrooms = [] } = useQuery(posShowroomsQueryOptions());

  // The selected showroom's own categories
  const { data: categories = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-categories", till.id],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data } = await axios.get("/api/category", {
        params: { deleteType: "SD", size: 10000, start: 0, showroomId: till.id },
      });
      if (!data.success) throw new Error(data.message || "Could not load categories");
      return data.data || [];
    },
  });

  useEffect(() => {
    setPage(1);
  }, [till.id]);

  const pages = Math.max(1, Math.ceil(categories.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = categories.slice((safePage - 1) * pageSize, safePage * pageSize);

  const createCategory = async (event) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const { data } = await axios.post("/api/category/create", {
        name,
        slug: slugify(name, { lower: true, strict: true }),
        showroomId: till.id,
      });
      if (!data.success) throw new Error(data.message);
      showToast("success", data.message);
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || t("Could not add category", "ক্যাটাগরি যোগ হয়নি"));
    } finally {
      setCreating(false);
    }
  };

  const updateCategory = async (event) => {
    event.preventDefault();
    const name = editName.trim();
    if (!name || !editing) return;
    setUpdating(true);
    try {
      const { data } = await axios.put("/api/category/update", {
        _id: editing._id,
        name,
        slug: slugify(name, { lower: true, strict: true }),
      });
      if (!data.success) throw new Error(data.message);
      showToast("success", data.message);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || t("Could not update category", "ক্যাটাগরি আপডেট হয়নি"));
    } finally {
      setUpdating(false);
    }
  };

  const toggle = async (row) => {
    setBusy(true);
    try {
      const { data } = await axios.put("/api/category/toggle", { id: row._id, isActive: row.isActive === false });
      showToast(data.success ? "success" : "error", data.message);
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    } catch (error) {
      showToast("error", error.response?.data?.message || t("Could not update category", "ক্যাটাগরি আপডেট হয়নি"));
    } finally {
      setBusy(false);
    }
  };

  const trash = async (row) => {
    if (!confirm(t(`Move "${row.name}" to trash?`, `"${row.name}" ট্র্যাশে পাঠাবেন?`))) return;
    setBusy(true);
    try {
      const { data } = await axios.put("/api/category/delete", { ids: [row._id], deleteType: "SD" });
      showToast(data.success ? "success" : "error", data.success ? t("Category moved to trash", "ক্যাটাগরি ট্র্যাশে গেছে") : data.message);
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    } catch (error) {
      showToast("error", error.response?.data?.message || t("Could not delete category", "ক্যাটাগরি মুছা যায়নি"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-[8px] bg-white p-[24px] shadow-[0_1px_3px_rgba(16,24,40,0.08)] dark:bg-card">
      <div className="mb-[28px] flex flex-wrap items-start justify-between gap-3">
        <h1 className="m-0 text-[22px] font-semibold text-[#212529] dark:text-foreground">{t("Categories", "ক্যাটাগরি")}</h1>
        <button type="button" onClick={() => { setNewName(""); setCreateOpen(true); }} className={`${btn.primary} !px-[18px] !py-[10px] !text-[14px]`}>
          <Plus size={16} /> {t("Add New Category", "নতুন ক্যাটাগরি")}
        </button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[620px] gap-0 p-0">
          <DialogHeader className="border-b bg-[#f7f7f7] px-[26px] py-[24px]">
            <DialogTitle className="text-[20px] font-medium">{t("Category Create", "ক্যাটাগরি তৈরি")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={createCategory} className="space-y-4 px-[26px] py-[22px]">
            <label className="block text-[16px] text-[#212529]">
              {t("Name", "নাম")} <span className="text-[#ff5b5b]">*</span>
              <input
                required
                autoFocus
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder={t("Name", "নাম")}
                className={`${filterInput} mt-2 !h-[48px]`}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="submit" disabled={creating} className="rounded-[4px] bg-[#10c469] px-[18px] py-[10px] text-[15px] font-medium text-white hover:bg-[#0dab5b] disabled:opacity-60">
                {creating ? t("Saving...", "সেভ হচ্ছে...") : t("Submit", "সাবমিট")}
              </button>
              <button type="button" onClick={() => setCreateOpen(false)} className="rounded-[4px] bg-[#ff5b5b] px-[18px] py-[10px] text-[15px] font-medium text-white hover:bg-[#f24242]">
                {t("Close", "বন্ধ")}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent className="max-w-[620px] gap-0 p-0">
          <DialogHeader className="border-b bg-[#f7f7f7] px-[26px] py-[24px]">
            <DialogTitle className="text-[20px] font-medium">{t("Category Update", "ক্যাটাগরি আপডেট")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={updateCategory} className="space-y-4 px-[26px] py-[22px]">
            <label className="block text-[16px] text-[#212529]">
              {t("Name", "নাম")} <span className="text-[#ff5b5b]">*</span>
              <input
                required
                autoFocus
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className={`${filterInput} mt-2 !h-[48px]`}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="submit" disabled={updating} className="rounded-[4px] bg-[#10c469] px-[18px] py-[10px] text-[15px] font-medium text-white hover:bg-[#0dab5b] disabled:opacity-60">
                {updating ? t("Saving...", "সেভ হচ্ছে...") : t("Update", "আপডেট")}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="rounded-[4px] bg-[#ff5b5b] px-[18px] py-[10px] text-[15px] font-medium text-white hover:bg-[#f24242]">
                {t("Close", "বন্ধ")}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
              <th className={`${thClass} !text-[16px]`}>{t("Category Name", "ক্যাটাগরির নাম")}</th>
              <th className={`${thClass} !text-[16px]`}>{t("Action", "অ্যাকশন")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={3} className={`${tdClass} py-8 text-center`}>{t("Loading...", "লোড হচ্ছে...")}</td></tr>
            )}
            {!isLoading && isError && (
              <tr>
                <td colSpan={3} className={`${tdClass} py-8 text-center`}>
                  <button type="button" className="text-[#188ae2] underline" onClick={() => refetch()}>
                    {t("Could not load categories. Retry", "ক্যাটাগরি লোড হয়নি। আবার চেষ্টা করুন")}
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <EmptyRow colSpan={3} title={t("No category yet", "এখনো কোনো ক্যাটাগরি নেই")} />
            )}
            {!isLoading &&
              rows.map((row, index) => (
                <tr key={row._id} className="odd:bg-[#f4f7fa] dark:odd:bg-muted/40">
                  <td className={`${tdClass} !text-[16px]`}>{(safePage - 1) * pageSize + index + 1}</td>
                  <td className={`${tdClass} !text-[17px]`}>{row.name}</td>
                  <td className={tdClass}>
                    <div className="flex">
                      <button type="button" onClick={() => { setEditName(row.name); setEditing(row); }} className="rounded-l-[4px] bg-[#188ae2] px-[14px] py-[8px] text-[14px] font-medium text-white hover:bg-[#1379c7]">
                        {t("Edit", "সম্পাদনা")}
                      </button>
                      <button type="button" onClick={() => toggle(row)} className="bg-[#f9c851] px-[14px] py-[8px] text-[14px] font-medium text-white hover:bg-[#f0b93a]">
                        {row.isActive === false ? t("Active", "চালু") : t("Deactive", "বন্ধ")}
                      </button>
                      <button type="button" onClick={() => trash(row)} className="rounded-r-[4px] bg-[#ff5b5b] px-[14px] py-[8px] text-[14px] font-medium text-white hover:bg-[#f24242]">
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
        from={categories.length ? (safePage - 1) * pageSize + 1 : 0}
        count={rows.length}
        total={categories.length}
        onPage={setPage}
      />
      {busy && <p className="m-0 pt-2 text-[12px] text-[#868e96]">{t("Saving...", "সেভ হচ্ছে...")}</p>}
    </div>
  );
}
