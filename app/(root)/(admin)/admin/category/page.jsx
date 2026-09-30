"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { ADMIN_CATEGORY_ADD, ADMIN_CATEGORY_EDIT } from "@/Route/Adminpannelroute";
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

const fetchCategories = async () => {
  const { data } = await axios.get("/api/category", {
    params: { deleteType: "SD", size: 10000, start: 0 },
  });
  if (!data.success) throw new Error(data.message || "Could not load categories");
  return data.data || [];
};

export default function CategoryPage() {
  const { language } = useLanguage();
  const t = (en, bn) => oneLine(en, bn, language);
  const till = useOpeningStockTill();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  const { data: categories = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-categories", till.id],
    queryFn: fetchCategories,
  });

  useEffect(() => {
    setQ("");
    setPage(1);
  }, [till.id]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter((cat) => `${cat.name} ${cat.slug}`.toLowerCase().includes(needle));
  }, [categories, q]);

  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

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
    <div className="space-y-4">
      <ListCard
        title={t("Category List", "ক্যাটাগরি তালিকা")}
        actions={
          <Link href={ADMIN_CATEGORY_ADD} className={btn.success}>
            <Plus size={14} /> {t("Add New Category", "নতুন ক্যাটাগরি")}
          </Link>
        }
      >
        <form className="mb-4 flex flex-wrap items-center gap-2" onSubmit={(event) => event.preventDefault()}>
          <input
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
            placeholder={t("Search category", "ক্যাটাগরি খুঁজুন")}
            className={`${filterInput} min-w-[220px] flex-1`}
          />
          <button type="submit" className={btn.info}>{t("Search", "খুঁজুন")}</button>
          <button type="button" className={btn.warning} onClick={() => { setQ(""); setPage(1); }}>
            {t("Clear", "মুছুন")}
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className={theadClass}>
                <th className={thClass}>{t("SL", "ক্রম")}</th>
                <th className={thClass}>{t("Name", "নাম")}</th>
                <th className={thClass}>{t("Slug", "স্লাগ")}</th>
                <th className={thClass}>{t("Action", "অ্যাকশন")}</th>
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
                      {t("Could not load categories. Retry", "ক্যাটাগরি লোড হয়নি। আবার চেষ্টা করুন")}
                    </button>
                  </td>
                </tr>
              )}
              {!isLoading && !isError && rows.length === 0 && (
                <EmptyRow
                  colSpan={4}
                  title={q ? t("No category matched your search", "এই খোঁজে কোনো ক্যাটাগরি নেই") : t("No category yet", "এখনো কোনো ক্যাটাগরি নেই")}
                />
              )}
              {!isLoading &&
                rows.map((row, index) => (
                  <tr key={row._id} className="hover:bg-[#f5f7f9] dark:hover:bg-muted/50">
                    <td className={tdClass}>{(safePage - 1) * pageSize + index + 1}</td>
                    <td className={`${tdClass} font-medium`}>{row.name}</td>
                    <td className={tdClass}>{row.slug}</td>
                    <td className={tdClass}>
                      <ActionMenu
                        label={t("Action", "অ্যাকশন")}
                        items={[
                          [t("Edit", "সম্পাদনা"), () => { window.location.href = ADMIN_CATEGORY_EDIT(row._id); }],
                          [t("Delete", "মুছুন"), () => trash(row), "danger"],
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
        {busy && <p className="m-0 pt-2 text-[12px] text-[#868e96]">{t("Saving...", "সেভ হচ্ছে...")}</p>}
      </ListCard>
    </div>
  );
}
