"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownUp, Funnel, History, PlusCircle, Search } from "lucide-react";

import { ADMIN_TELEKHATA, ADMIN_TELEKHATA_PARTY } from "@/Route/Adminpannelroute";
import { useOpeningStockTill } from "@/lib/posProducts";
import { printHtml, bnNumber, money, t } from "./telekhataKit";
import { AppBar, BottomSheet, HelpIcon, PdfIcon, Screen } from "./tkUI";

const TABS = [
  ["customer", "কাস্টমার"],
  ["supplier", "সাপ্লায়ার"],
  ["employee", "কর্মচারী"],
];
const TYPE_LABEL = { customer: "কাস্টমার", supplier: "সাপ্লায়ার", employee: "কর্মচারী" };
const FILTERS = [
  ["all", "সবাই"],
  ["pabo", "শুধু পাবো"],
  ["dibo", "শুধু দিবো"],
  ["zero", "বাকি নেই"],
];

const dayText = (value) =>
  new Date(value).toLocaleDateString("bn-BD", { day: "2-digit", month: "short", year: "numeric" });

// Baki Khata: who owes the shop (Pabo) and whom the shop owes (Dibo)
export default function BakiKhata() {
  const till = useOpeningStockTill();
  const router = useRouter();

  const [type, setType] = useState("customer");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("amount");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["telekhata-parties", till.id, type, debounced],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const qs = new URLSearchParams({ type, showroomId: till.id, search: debounced });
      const res = await fetch(`/api/telekhata/parties?${qs}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json;
    },
  });

  const onSearch = (value) => {
    setSearch(value);
    clearTimeout(onSearch.timer);
    onSearch.timer = setTimeout(() => setDebounced(value.trim()), 250);
  };

  const parties = useMemo(() => {
    let list = data?.parties || [];
    if (filter === "pabo") list = list.filter((p) => p.balance > 0);
    if (filter === "dibo") list = list.filter((p) => p.balance < 0);
    if (filter === "zero") list = list.filter((p) => p.balance === 0);
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [data, filter, sort]);

  const pabo = data?.totals?.pabo || 0;
  const dibo = data?.totals?.dibo || 0;
  const net = Math.abs(pabo - dibo);

  const openParty = (party, isNew) => router.push(`${ADMIN_TELEKHATA_PARTY(type, party._id)}${isNew ? "?new=1" : ""}`);

  const printAll = () => {
    const rows = parties
      .map((p) => `<tr><td>${p.name}<br>${p.phone}</td><td>${p.balance > 0 ? "পাবো" : p.balance < 0 ? "দিবো" : ""}</td><td>${bnNumber(Math.abs(p.balance))} ৳</td></tr>`)
      .join("");
    printHtml("বাকির খাতা", `<h3>${till.name} - বাকির খাতা</h3><p>পাবো: ${money(pabo)} · দিবো: ${money(dibo)}</p><table><tr><th>নাম</th><th></th><th>টাকা</th></tr>${rows}</table>`);
  };

  return (
    <Screen className="pb-24">
      <AppBar title={t("Baki Khata", "বাকির খাতা")} onBack={() => router.push(ADMIN_TELEKHATA)}>
        <button type="button" onClick={printAll} aria-label="PDF">
          <PdfIcon />
        </button>
        <HelpIcon />
      </AppBar>

      <div className="space-y-3 p-3">
        {/* summary */}
        <div className="rounded-xl border border-[#e2e2e2] bg-[#f6f6f6] p-3 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#f0b9b6] bg-[#fbe3e1] py-3 text-center">
              <p className="m-0 text-[17px] text-[#d9453c]">{t("Pabo", "পাবো")}</p>
              <p className="m-0 mt-1 text-[16px] font-bold text-[#c0392b]">{money(pabo)}</p>
            </div>
            <div className="rounded-xl border border-[#b9e4c4] bg-[#e1f5e6] py-3 text-center">
              <p className="m-0 text-[17px] text-[#2e9b4a]">{t("Dibo", "দিবো")}</p>
              <p className="m-0 mt-1 text-[16px] font-bold text-[#2e9b4a]">{money(dibo)}</p>
            </div>
          </div>
          <p className="m-0 mt-2 text-center text-[14px]">
            বাকী পাবো/দিবো হিসাবের পর সর্বমোট {dibo >= pabo ? "দিবো" : "পাবো"}:{" "}
            <span className={dibo >= pabo ? "text-[#2e9b4a]" : "text-[#d9453c]"}>{money(net)}</span>
          </p>
          <div className="mt-3 flex justify-center">
            <Link
              href="/admin/telekhata/baki/history"
              className="flex items-center gap-2 rounded-xl border-2 border-[#1b56d8] bg-white px-5 py-2 text-[16px] text-[#1b56d8]"
            >
              <History className="size-5" /> {t("Baki history", "বাকির ইতিহাস")}
            </Link>
          </div>
        </div>

        {/* search + filter + sort */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-lg border-2 border-[#1b56d8] bg-white px-3">
            <Search className="size-6 shrink-0 text-[#555]" />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="খুঁজুন (নাম,মোবাইল)"
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            />
            <span className="h-6 w-px bg-[#999]" />
            <button type="button" onClick={() => setFilterOpen(true)} className="flex shrink-0 items-center gap-1 text-[15px]">
              <Funnel className="size-5" /> ফিল্টার
            </button>
          </div>
          <button type="button" onClick={() => setSort(sort === "amount" ? "name" : "amount")} aria-label="সাজান" className="text-[#1b56d8]">
            <ArrowDownUp className="size-7" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 text-[14px]">
          <div className="flex flex-wrap items-center gap-1">
            {TABS.map(([key, label], index) => (
              <span key={key} className="flex items-center gap-1">
                {index > 0 && <span>/</span>}
                <button
                  type="button"
                  onClick={() => setType(key)}
                  className={type === key ? "font-bold underline decoration-[#1b56d8] underline-offset-4" : ""}
                >
                  {label} ({bnNumber(data?.counts?.[key] ?? 0)})
                </button>
              </span>
            ))}
          </div>
          <span className="shrink-0">
            <span className="text-[#d9453c]">পাবো</span> / <span className="text-[#2e9b4a]">দিবো</span>
          </span>
        </div>

        {/* list */}
        <div className="space-y-3">
          {isLoading && <p className="py-8 text-center text-sm text-[#777]">লোড হচ্ছে...</p>}
          {isError && (
            <button type="button" onClick={() => refetch()} className="w-full py-8 text-center text-sm text-[#1b56d8] underline">
              লোড হয়নি। আবার চেষ্টা করুন
            </button>
          )}
          {!isLoading && !isError && parties.length === 0 && <p className="py-8 text-center text-sm text-[#777]">কাউকে পাওয়া যায়নি</p>}

          {parties.map((party) => (
            <button
              key={party._id}
              type="button"
              onClick={() => openParty(party, false)}
              className={`flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left shadow-sm active:scale-[0.99] ${
                party.balance < 0 ? "border-[#b9e4c4]" : "border-[#f0b9b6]"
              }`}
            >
              {party.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={party.photo} alt="" className="size-14 shrink-0 rounded-full border object-cover" />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#1b56d8] text-[24px] font-bold text-white">
                  {String(party.name || "?").slice(0, 1)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[17px] font-medium text-[#111]">{party.name}</p>
                <p className="m-0 text-[14px] text-[#666]">+88{party.phone}</p>
                {party.last && <p className="m-0 text-[13px] text-[#666]">{dayText(party.last)} পর্যন্ত</p>}
              </div>
              <div className="text-right">
                <p className={`m-0 text-[18px] font-bold ${party.balance < 0 ? "text-[#2e9b4a]" : "text-[#d9453c]"}`}>
                  {money(Math.abs(party.balance))}
                </p>
                <p className="m-0 text-[13px] text-[#666]">{TYPE_LABEL[type]}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* new baki */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-xl bg-white p-3 dark:bg-background">
        <button
          type="button"
          onClick={() => setPickOpen(true)}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#1b56d8] text-[19px] font-medium text-white shadow-md active:scale-[0.99]"
        >
          <PlusCircle className="size-7" strokeWidth={1.6} /> {t("New baki", "নতুন বাকি")}
        </button>
      </div>

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="ফিল্টার">
        <div className="space-y-2">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setFilter(key);
                setFilterOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-[16px] ${filter === key ? "border-[#1b56d8] bg-[#1b56d8]/5 font-semibold" : "bg-[#f1f1f1]"}`}
            >
              {label}
              <span className={`flex size-5 items-center justify-center rounded-full border-2 ${filter === key ? "border-[#1b56d8]" : "border-gray-400"}`}>
                {filter === key && <span className="size-2.5 rounded-full bg-[#1b56d8]" />}
              </span>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={pickOpen} onClose={() => setPickOpen(false)} title={`কাকে বাকি দিচ্ছেন? (${TYPE_LABEL[type]})`}>
        <div className="max-h-[55vh] divide-y overflow-y-auto rounded-xl border">
          {(data?.parties || []).length === 0 && <p className="py-6 text-center text-sm text-[#777]">কেউ নেই</p>}
          {(data?.parties || []).map((party) => (
            <button key={party._id} type="button" onClick={() => openParty(party, true)} className="block w-full px-4 py-3 text-left text-[16px] hover:bg-[#f4f4f4]">
              {party.name} <span className="text-[#777]">(+88{party.phone})</span>
            </button>
          ))}
        </div>
      </BottomSheet>
    </Screen>
  );
}
