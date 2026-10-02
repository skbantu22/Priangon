"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { RotateCcw, Trash2 } from "lucide-react";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { useLanguage } from "@/hooks/useLanguage";
import { oneLine } from "@/lib/labels";
import { useOpeningStockTill } from "@/lib/posProducts";
import { showToast } from "@/lib/showToast";
import { TRASH_RETENTION_DAYS, TRASH_TABS, trashTab } from "@/lib/trash";
import { ADMIN_DASHBOARD, ADMIN_TRASH } from "@/Route/Adminpannelroute";
import {
  EmptyRow,
  ListCard,
  Pagination,
  btn,
  filterInput,
  tdClass,
  thClass,
  theadRow,
} from "@/components/ui/Application/Admin/listKit";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_TRASH, label: "Trash" },
];

const DEFAULT_TAB = TRASH_TABS[0].key;

const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

/** How close a row is to being wiped, as a coloured chip */
function DaysLeft({ days, t }) {
  const tone =
    days <= 3
      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
      : days <= 7
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <span className={`inline-block rounded-full px-[10px] py-[2px] text-[12px] font-medium ${tone}`}>
      {days === 0 ? t("Today", "আজ") : t(`${days} day(s)`, `${days} দিন`)}
    </span>
  );
}

function TrashScreen() {
  const { language } = useLanguage();
  const t = (en, bn) => oneLine(en, bn, language);

  const router = useRouter();
  const searchParams = useSearchParams();

  // the trash follows the shop in the top switch, like every other list
  const till = useOpeningStockTill();

  // ?trashof= keeps the old links from the product and category screens working
  const requested = searchParams.get("trashof");
  const tab = TRASH_TABS.some((entry) => entry.key === requested) ? requested : DEFAULT_TAB;

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1, from: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);

  const current = useMemo(() => trashTab(tab), [tab]);
  const label = current?.label || "Trash";
  // only the tabs with an owning shop narrow down to the branch switch
  const branch = current?.scoped ? till.id || "all" : "";

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get("/api/trash", {
        params: { type: tab, page, limit, ...(branch && { branch }), ...(search && { search }) },
      });

      if (!data.success) {
        showToast("error", data.message || t("Could not load the trash", "ট্র্যাশ লোড হয়নি"));
        return;
      }

      setRows(data.data);
      setMeta({ total: data.total, pages: data.pages, from: data.from });
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || t("Could not load the trash", "ট্র্যাশ লোড হয়নি"),
      );
    } finally {
      setLoading(false);
    }
  }, [tab, page, limit, branch, search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  // A different tab or shop starts clean — the old page and ticks mean
  // nothing there
  useEffect(() => {
    setPage(1);
    setPicked([]);
    setDraft("");
    setSearch("");
  }, [tab, branch]);

  const openTab = (key) => router.push(`${ADMIN_TRASH}?trashof=${key}`);

  const allTicked = rows.length > 0 && picked.length === rows.length;

  const tick = (id) =>
    setPicked((ticked) =>
      ticked.includes(id) ? ticked.filter((one) => one !== id) : [...ticked, id],
    );

  const run = async (ids, action) => {
    if (ids.length === 0) return;

    if (
      action === "delete" &&
      !confirm(
        t(
          `Permanently delete ${ids.length} item(s)? This cannot be undone.`,
          `${ids.length} টি স্থায়ীভাবে মুছবেন? এটি আর ফেরানো যাবে না।`,
        ),
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const { data } = await axios.post("/api/trash", { type: tab, ids, action, branch });

      showToast(data.success ? "success" : "error", data.message);

      if (data.success) {
        setPicked([]);
        load();
      }
    } catch (error) {
      showToast("error", error.response?.data?.message || t("Could not finish", "কাজটি শেষ হয়নি"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <ListCard
        title={t(`${label} Trash`, `${label} ট্র্যাশ`)}
        actions={
          <div className="text-right text-[13px] text-[#6c757d] dark:text-muted-foreground">
            <p>
              {t(
                `Deleted items are wiped automatically after ${TRASH_RETENTION_DAYS} days`,
                `মুছে ফেলা জিনিস ${TRASH_RETENTION_DAYS} দিন পর নিজে থেকেই চিরতরে মুছে যাবে`,
              )}
            </p>
            <p>
              {current?.scoped
                ? t(
                    `This tab follows the shop switch — ${till.name || "this shop"} only`,
                    `এই ট্যাব শপ সুইচ অনুসরণ করে — শুধু ${till.name || "এই শপ"}`,
                  )
                : t("This tab is shared by every shop", "এই ট্যাব সব শপের জন্য এক")}
            </p>
          </div>
        }
      >
        <div className="mb-[14px] flex flex-wrap gap-[6px]">
          {TRASH_TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => openTab(entry.key)}
              className={`rounded-[6px] border px-[14px] py-[7px] text-[13px] transition ${
                entry.key === tab
                  ? "border-[#188ae2] bg-[#188ae2] text-white"
                  : "border-[#e3e3e3] bg-white text-[#495057] hover:bg-[#f1f5f9] dark:border-border dark:bg-transparent dark:text-foreground"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="mb-[14px] flex flex-wrap items-center gap-[8px]">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(draft.trim());
            }}
            className="flex items-center gap-[8px]"
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("Search", "খুঁজুন")}
              className={`${filterInput} w-[220px]`}
            />
            <button type="submit" className={btn.primary}>
              {t("Search", "খুঁজুন")}
            </button>
          </form>

          <select
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
            className={`${filterInput} w-[90px]`}
          >
            {[10, 20, 50, 100, 200].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>

          <div className="ml-auto flex flex-wrap gap-[8px]">
            <button
              type="button"
              disabled={busy || picked.length === 0}
              onClick={() => run(picked, "restore")}
              className={btn.success}
            >
              <RotateCcw size={15} />
              {t("Restore", "ফিরিয়ে আনুন")} {picked.length > 0 && `(${picked.length})`}
            </button>
            <button
              type="button"
              disabled={busy || picked.length === 0}
              onClick={() => run(picked, "delete")}
              className={btn.danger}
            >
              <Trash2 size={15} />
              {t("Delete permanently", "চিরতরে মুছুন")}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className={theadRow}>
                <th className={`${thClass} w-[40px]`}>
                  <input
                    type="checkbox"
                    aria-label={t("Select all", "সব বাছুন")}
                    className="size-4 align-middle"
                    checked={allTicked}
                    onChange={() => setPicked(allTicked ? [] : rows.map((row) => row._id))}
                  />
                </th>
                <th className={`${thClass} w-[60px]`}>{t("SL", "ক্রম")}</th>
                <th className={thClass}>{t("Name", "নাম")}</th>
                <th className={thClass}>{t("Details", "বিবরণ")}</th>
                <th className={thClass}>{t("Deleted On", "মুছার তারিখ")}</th>
                <th className={thClass}>{t("Auto Delete In", "স্বয়ংক্রিয় মুছা")}</th>
                <th className={`${thClass} w-[180px]`}>{t("Action", "কাজ")}</th>
              </tr>
            </thead>

            <tbody>
              {loading && <EmptyRow colSpan={7} title={t("Loading...", "লোড হচ্ছে...")} />}

              {!loading && rows.length === 0 && (
                <EmptyRow
                  colSpan={7}
                  title={t("The trash is empty", "ট্র্যাশ খালি")}
                  hint={t(
                    "Anything you delete shows up here first",
                    "আপনি যা মুছবেন তা প্রথমে এখানে আসবে",
                  )}
                />
              )}

              {!loading &&
                rows.map((row, index) => (
                  <tr key={row._id} className="hover:bg-[#f5f7f9] dark:hover:bg-muted/50">
                    <td className={tdClass}>
                      <input
                        type="checkbox"
                        aria-label={row.title}
                        className="size-4 align-middle"
                        checked={picked.includes(row._id)}
                        onChange={() => tick(row._id)}
                      />
                    </td>
                    <td className={tdClass}>{meta.from + index}</td>
                    <td className={`${tdClass} font-medium`}>{row.title}</td>
                    <td className={tdClass}>{row.subtitle}</td>
                    <td className={tdClass}>{fmtDate(row.deletedAt)}</td>
                    <td className={tdClass}>
                      <DaysLeft days={row.daysLeft} t={t} />
                    </td>
                    <td className={tdClass}>
                      <div className="flex gap-[6px]">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run([row._id], "restore")}
                          className="rounded-[4px] bg-[#10c469] px-[12px] py-[6px] text-[13px] text-white hover:bg-[#0dab5b] disabled:opacity-60"
                        >
                          {t("Restore", "ফেরান")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run([row._id], "delete")}
                          className="rounded-[4px] bg-[#ff5b5b] px-[12px] py-[6px] text-[13px] text-white hover:bg-[#f24242] disabled:opacity-60"
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
          page={page}
          pages={meta.pages}
          from={meta.from}
          count={rows.length}
          total={meta.total}
          onPage={setPage}
        />
      </ListCard>
    </div>
  );
}

/**
 * useSearchParams has to sit under a Suspense boundary, or the production
 * build refuses to prerender this route and the screen comes up blank.
 */
export default function TrashPage() {
  return (
    <Suspense fallback={null}>
      <TrashScreen />
    </Suspense>
  );
}
