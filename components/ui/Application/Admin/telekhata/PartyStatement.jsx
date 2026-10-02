"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { FcMoneyTransfer, FcPackage } from "react-icons/fc";
import { BellRing, CalendarDays, ChevronLeft, ChevronRight, ImagePlus, MessageSquare, Phone, ScanBarcode, Search, Trash2 } from "lucide-react";

import { ADMIN_TELEKHATA_BAKI } from "@/Route/Adminpannelroute";
import { normalizeCustomerType, rateForType } from "@/lib/priceTiers";
import { useOpeningStockTill } from "@/lib/posProducts";
import { showToast } from "@/lib/showToast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { bnNumber, dateLabel, money, printHtml, shortDate, t, todayInput, windowFor } from "./telekhataKit";
import { AppBar, BottomSheet, DotsIcon, PdfIcon, PickCard, Screen, Switch } from "./tkUI";

const RANGES = [
  ["day", "দিন"],
  ["month", "মাস"],
  ["year", "বছর"],
  ["all", "সব সময়"],
  ["custom", "কাস্টম"],
];
const TYPE_NAME = { customer: "কাস্টমার", supplier: "সাপ্লায়ার", employee: "কর্মচারী" };
const RATE_LABEL = {
  retail: "বিক্রয় মূল্য",
  dealer: "ডিলার দর",
  subDealer: "সাব ডিলার দর",
  wholesaler: "পাইকারি দর",
};

const dayWords = (value) => new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "long" });
const num = (value) => Math.max(0, Number(value) || 0);

// One party's statement, and the Dichhi / Nichhi flow:
// statement -> "which kind of baki" sheet -> taka baki page | product baki list
export default function PartyStatement({ type, id, askKind = false }) {
  const till = useOpeningStockTill();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [view, setView] = useState("statement"); // statement | money | goods
  const [direction, setDirection] = useState("give");
  const [kindOpen, setKindOpen] = useState(askKind);
  const [menuOpen, setMenuOpen] = useState(false);
  const [range, setRange] = useState({ key: "year", offset: 0, start: "", end: "" });

  const win = useMemo(() => (range.key === "custom" ? { start: range.start, end: range.end } : windowFor(range.key, range.offset)), [range]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["telekhata-statement", type, id, till.id, win.start, win.end],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const qs = new URLSearchParams({ type, id, showroomId: till.id, start: win.start || "", end: win.end || "" });
      const res = await fetch(`/api/telekhata/entries?${qs}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["telekhata-statement"] });
    queryClient.invalidateQueries({ queryKey: ["telekhata-parties"] });
    queryClient.invalidateQueries({ queryKey: ["telekhata-summary"] });
    queryClient.invalidateQueries({ queryKey: ["telekhata-history"] });
  };

  const party = data?.party;
  const summary = data?.summary;
  const balance = summary?.balance || 0;

  const start = (dir) => {
    setDirection(dir);
    setKindOpen(true);
  };

  const remove = async (row) => {
    if (!confirm("এই এন্ট্রি মুছবেন?")) return;
    const res = await fetch(`/api/telekhata/entries?id=${row._id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    showToast(json.success ? "success" : "error", json.success ? "এন্ট্রি মুছে গেছে" : json.message || "মোছা যায়নি");
    if (json.success) refresh();
  };

  const saveDueDate = async (value) => {
    const res = await fetch("/api/telekhata/parties", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partyType: type, partyId: id, showroomId: till.id, dueDate: value || null }),
    });
    const json = await res.json().catch(() => ({}));
    if (json.success) refresh();
    else showToast("error", json.message || "তারিখ সেভ হয়নি");
  };

  const remind = () => {
    if (!party?.phone) return showToast("error", "মোবাইল নম্বর নেই");
    const text = `আসসালামু আলাইকুম ${party.name}, আপনার কাছে ${till.name} এর ${money(Math.abs(balance))} বাকি আছে। অনুগ্রহ করে পরিশোধ করুন।`;
    window.location.href = `sms:${party.phone}?body=${encodeURIComponent(text)}`;
  };

  const printStatement = () => {
    if (!data) return;
    const rows = data.rows
      .map((row) => `<tr><td>${dateLabel(row.date)}<br>${row.note || ""}</td><td>${row.direction === "take" ? bnNumber(row.amount) : ""}</td><td>${row.direction === "give" ? bnNumber(row.amount) : ""}</td><td>${bnNumber(row.balance)}</td></tr>`)
      .join("");
    printHtml(
      "বাকির বিবরণ",
      `<h3>${till.name}</h3><p>${party.name} (${TYPE_NAME[type]})<br>${party.phone}<br>${balance < 0 ? "দিবো" : "পাবো"}: ${money(Math.abs(balance))}</p><table><tr><th>ইতিহাস</th><th>নিয়েছি</th><th>দিয়েছি</th><th>ব্যালেন্স</th></tr>${rows}<tr><th>মোট</th><th>${bnNumber(summary.taken)}</th><th>${bnNumber(summary.given)}</th><th>${bnNumber(summary.balance)}</th></tr></table>`,
    );
  };

  // ------------------------------------------------------------ money page
  if (view === "money") {
    return (
      <MoneyEntry
        direction={direction}
        party={party}
        type={type}
        id={id}
        balance={balance}
        showroomId={till.id}
        onBack={() => setView("statement")}
        onSaved={() => {
          setView("statement");
          refresh();
        }}
      />
    );
  }

  // ----------------------------------------------------------- goods page
  if (view === "goods") {
    return (
      <GoodsEntry
        direction={direction}
        party={party}
        type={type}
        id={id}
        showroomId={till.id}
        onBack={() => setView("statement")}
        onSaved={() => {
          setView("statement");
          refresh();
        }}
      />
    );
  }

  // ------------------------------------------------------------- statement
  return (
    <Screen className="pb-28">
      <AppBar title="বাকির বিবরণ" onBack={() => router.push(ADMIN_TELEKHATA_BAKI)}>
        <button type="button" onClick={printStatement} aria-label="PDF">
          <PdfIcon />
        </button>
        <div className="relative">
          <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="মেনু">
            <DotsIcon />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 z-40 w-44 overflow-hidden rounded-lg border bg-white shadow-lg">
              <button type="button" onClick={() => { setMenuOpen(false); printStatement(); }} className="block w-full px-4 py-3 text-left text-[15px] hover:bg-[#f4f4f4]">
                প্রিন্ট করুন
              </button>
              <button type="button" onClick={() => { setMenuOpen(false); refetch(); }} className="block w-full px-4 py-3 text-left text-[15px] hover:bg-[#f4f4f4]">
                রিফ্রেশ
              </button>
            </div>
          )}
        </div>
      </AppBar>

      {isLoading && <p className="py-10 text-center text-sm text-[#777]">লোড হচ্ছে...</p>}
      {isError && (
        <button type="button" onClick={() => refetch()} className="w-full py-10 text-center text-sm text-[#1b56d8] underline">
          লোড হয়নি। আবার চেষ্টা করুন
        </button>
      )}

      {party && (
        <div className="space-y-3 p-3">
          {/* party card */}
          <div className="rounded-xl border border-[#f0b9b6] bg-[#fdf1dc] p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="m-0 text-[19px] text-[#111]">
                  {party.name} ({TYPE_NAME[type]})
                </p>
                <p className="m-0 mt-2 text-[18px] text-[#111]">+88{party.phone}</p>
              </div>
              <div className="flex shrink-0 items-center gap-4 pt-2 text-[#444]">
                {party.phone && (
                  <a href={`tel:${party.phone}`} aria-label="কল করুন">
                    <Phone className="size-6" />
                  </a>
                )}
                {party.phone && (
                  <a href={`sms:${party.phone}`} aria-label="মেসেজ">
                    <MessageSquare className="size-6" />
                  </a>
                )}
              </div>
            </div>
            <p className={`m-0 mt-2 text-[18px] ${balance < 0 ? "text-[#2e9b4a]" : "text-[#d9453c]"}`}>
              {balance < 0 ? "দিবো" : "পাবো"}: {money(Math.abs(balance))}
            </p>
          </div>

          {/* payment date */}
          <label className="relative flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#1b56d8]/60 bg-[#e9f2fb] px-4 py-3.5 text-[18px] text-[#222]">
            <span className="flex items-center gap-3">
              <BellRing className="size-6 text-[#444]" />
              {party.dueDate ? `পরিশোধের তারিখ: ${dateLabel(party.dueDate)}` : "পরিশোধের তারিখ নির্বাচন করুন"}
            </span>
            <ChevronRight className="size-6 text-[#1b56d8]" />
            <input
              type="date"
              defaultValue={party.dueDate ? new Date(party.dueDate).toISOString().slice(0, 10) : ""}
              onChange={(event) => saveDueDate(event.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="পরিশোধের তারিখ"
            />
          </label>

          <button type="button" onClick={remind} className="flex items-center gap-2 text-[18px] font-medium text-[#1b56d8]">
            বাকির তাগাদা পাঠান <span className="text-[22px] leading-none">→</span>
          </button>

          {/* date range */}
          <div className="flex items-center justify-between rounded-xl bg-[#1b56d8] px-3 py-4 text-white">
            {range.key === "all" || range.key === "custom" ? (
              <span className="mx-auto text-[16px]">
                {range.key === "all"
                  ? "সব সময়"
                  : range.start && range.end
                    ? `${shortDate(range.start)} - ${shortDate(range.end)}`
                    : "তারিখ বাছুন"}
              </span>
            ) : (
              <>
                <button type="button" onClick={() => setRange({ ...range, offset: range.offset - 1 })} aria-label="আগে">
                  <ChevronLeft className="size-7" />
                </button>
                <span className="text-[16px]">
                  {range.key === "day" ? shortDate(win.start) : `${shortDate(win.start)} - ${shortDate(win.end)}`}
                </span>
                <button type="button" onClick={() => setRange({ ...range, offset: range.offset + 1 })} aria-label="পরে">
                  <ChevronRight className="size-7" />
                </button>
              </>
            )}
          </div>

          <div className="grid grid-cols-5 gap-1.5 text-[14px]">
            {RANGES.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRange({ key, offset: 0, start: range.start, end: range.end })}
                className={`flex h-10 items-center justify-center gap-1 rounded-xl border px-1 ${range.key === key ? "border-[#1b56d8] bg-[#1b56d8] font-semibold text-white" : "bg-white text-[#333]"}`}
              >
                {key === "custom" && <CalendarDays className="size-4" />}
                {label}
              </button>
            ))}
          </div>

          {range.key === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={range.start} onChange={(event) => setRange({ ...range, start: event.target.value })} className="h-11 rounded-lg border px-2 text-[14px]" />
              <input type="date" value={range.end} onChange={(event) => setRange({ ...range, end: event.target.value })} className="h-11 rounded-lg border px-2 text-[14px]" />
            </div>
          )}

          {/* table */}
          <div className="grid grid-cols-[1.35fr_1fr_1fr_1fr] px-1 pt-1 text-[14px] font-medium">
            <span>বাকির ইতিহাস</span>
            <span className="text-center text-[#2e9b4a]">নিয়েছি</span>
            <span className="text-center text-[#d9453c]">দিয়েছি</span>
            <span className="text-center">ব্যালেন্স</span>
          </div>

          <div className="space-y-2">
            {data.rows.length === 0 && <p className="py-10 text-center text-[14px] text-[#777]">এখনো কোনো এন্ট্রি নেই</p>}
            {data.rows.map((row) => (
              <div key={row._id} className="grid grid-cols-[1.35fr_1fr_1fr_1fr] items-stretch overflow-hidden rounded-lg border bg-white shadow-sm">
                <div className="min-w-0 p-2">
                  <p className="m-0 text-[13px] leading-tight text-[#222]">
                    {dayWords(row.date)} {new Date(row.date).getFullYear()} |{" "}
                    {new Date(row.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {(row.note || row.kind === "goods") && (
                    <p className="m-0 mt-0.5 truncate text-[12px] text-[#555]">
                      {row.kind === "goods" ? "পণ্য · " : ""}নোট: {row.note || "—"}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    {row.photo && (
                      <a href={row.photo} target="_blank" rel="noreferrer" className="text-[11px] text-[#1b56d8] underline">
                        ছবি
                      </a>
                    )}
                    {row.source === "khata" && (
                      <button type="button" onClick={() => remove(row)} className="text-[#999] hover:text-red-500" aria-label="মুছুন">
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <span className={`flex items-center justify-center text-[15px] ${row.direction === "take" ? "bg-[#dcf2e1] font-medium text-[#2e9b4a]" : ""}`}>
                  {row.direction === "take" ? money(row.amount) : ""}
                </span>
                <span className={`flex items-center justify-center text-[15px] ${row.direction === "give" ? "bg-[#fbe0de] font-medium text-[#d9453c]" : "bg-[#fdeceb]"}`}>
                  {row.direction === "give" ? money(row.amount) : ""}
                </span>
                <span className="flex items-center justify-center text-[15px] text-[#d9453c]">{money(row.balance)}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1.35fr_1fr_1fr_1fr] px-1 pt-5 text-[15px]">
            <span>মোট</span>
            <span className="text-center text-[13px] text-[#2e9b4a]">{money(summary.taken)}</span>
            <span className="text-center text-[13px] text-[#d9453c]">{money(summary.given)}</span>
            <span className="text-center text-[#d9453c]">{money(summary.balance)}</span>
          </div>
        </div>
      )}

      {party && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-xl grid-cols-2 gap-4 bg-white p-4 dark:bg-background">
          <button type="button" onClick={() => start("give")} className="h-14 rounded-xl bg-[#ff3b30] text-[19px] font-medium text-white shadow-md active:scale-95">
            দিচ্ছি
          </button>
          <button type="button" onClick={() => start("take")} className="h-14 rounded-xl bg-[#2fb34f] text-[19px] font-medium text-white shadow-md active:scale-95">
            নিচ্ছি
          </button>
        </div>
      )}

      {/* "which kind of baki" sheet */}
      <BottomSheet
        open={kindOpen}
        onClose={() => setKindOpen(false)}
        title={direction === "give" ? "আপনি কি ধরনের বাকী দিচ্ছেন নির্বাচন করুন" : "আপনি কি ধরনের বাকী নিচ্ছেন নির্বাচন করুন"}
      >
        <div className="grid grid-cols-2 gap-4">
          {[
            ["goods", FcPackage, "পণ্য বাকী"],
            ["money", FcMoneyTransfer, "টাকা বাকী"],
          ].map(([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setKindOpen(false);
                setView(key);
              }}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-[#cfe4f5] bg-white py-5 text-[18px] shadow-sm active:scale-95"
            >
              <Icon className="size-[72px]" />
              {label}
            </button>
          ))}
        </div>
      </BottomSheet>
    </Screen>
  );
}

// ------------------------------------------------------------ taka baki page
function MoneyEntry({ direction, party, type, id, balance, showroomId, onBack, onSaved }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayInput());
  const [sms, setSms] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const photoRef = useRef(null);

  const save = async () => {
    if (!(Number(amount) > 0)) return showToast("error", "টাকার পরিমাণ লিখুন");

    setSaving(true);
    let uploadedId = null;
    try {
      let photo = "";
      if (photoFile) {
        const body = new FormData();
        body.append("file", photoFile);
        const up = await (await fetch("/api/media/upload", { method: "POST", body })).json();
        if (!up?.success || !up.media?.secure_url) throw new Error(up?.message || "ছবি আপলোড হয়নি");
        uploadedId = up.media._id;
        photo = up.media.secure_url;
      }

      const res = await fetch("/api/telekhata/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyType: type, partyId: id, direction, showroomId, kind: "money", amount, note, date, photo }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      showToast("success", "এন্ট্রি সেভ হয়েছে");
      if (sms && party?.phone) {
        const text = `${direction === "give" ? "আপনাকে" : "আপনার কাছ থেকে"} ${money(amount)} ${direction === "give" ? "বাকি দেওয়া হয়েছে" : "নেওয়া হয়েছে"}। ধন্যবাদ।`;
        window.open(`sms:${party.phone}?body=${encodeURIComponent(text)}`, "_self");
      }
      onSaved();
    } catch (error) {
      if (uploadedId) {
        fetch("/api/media/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [uploadedId], deleteType: "PD" }),
        }).catch(() => {});
      }
      showToast("error", error.message || "সেভ হয়নি");
    } finally {
      setSaving(false);
    }
  };

  const total = `${balance < 0 ? "মোট দিবোঃ" : "মোট পাবোঃ"} ${money(Math.abs(balance))}`;

  return (
    <Screen className="pb-24">
      <AppBar title="নতুন বাকি" onBack={onBack} />
      <div className="space-y-3 p-3">
        <div className="rounded-xl bg-[#fdc82f] py-4 text-center text-[17px] shadow-md">{total}</div>
        <p className="m-0 pt-3 text-center text-[17px] text-[#d9453c]">{total}</p>

        <label className="block space-y-1 text-[17px]">
          টাকার পরিমান
          <textarea
            rows={3}
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            className="block w-full resize-none rounded-lg border border-[#bbb] bg-white p-3 text-[18px] outline-none focus:border-[#1b56d8]"
          />
        </label>

        <label className="block space-y-1 text-[17px]">
          নোট
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="নোট"
            maxLength={300}
            className="block h-14 w-full rounded-lg border border-[#bbb] bg-white px-3 text-[17px] outline-none focus:border-[#1b56d8]"
          />
        </label>

        <div className="flex items-center justify-between">
          <input ref={photoRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => setPhotoFile(event.target.files?.[0] || null)} />
          <button type="button" onClick={() => photoRef.current?.click()} className="flex size-[72px] items-center justify-center overflow-hidden rounded-xl bg-white shadow-md" aria-label="ছবি দিন">
            {photoFile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={URL.createObjectURL(photoFile)} alt="" className="size-full object-cover" />
            ) : (
              <ImagePlus className="size-10 text-[#222]" strokeWidth={1.6} />
            )}
          </button>
          <label className="relative flex cursor-pointer items-center gap-3 text-[16px]">
            {new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "long" })}
            <CalendarDays className="size-7 text-[#1b56d8]" />
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="তারিখ" />
          </label>
        </div>

        <div className="mx-auto flex w-fit items-center gap-4 rounded-lg bg-[#efefef] px-5 py-3 text-[15px] text-[#444] shadow-sm">
          এস এম এস
          <Switch on={sms} onChange={setSms} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-xl bg-white p-3 dark:bg-background">
        <button type="button" disabled={saving} onClick={save} className="h-14 w-full rounded-xl bg-[#1b56d8] text-[19px] font-medium text-white shadow-md disabled:opacity-60">
          {saving ? "সেভ হচ্ছে..." : "আপডেট"}
        </button>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------- product baki page
function GoodsEntry({ direction, party, type, id, showroomId, onBack, onSaved }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [picked, setPicked] = useState({}); // variantId -> { name, price, qty }
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayInput());
  const [saving, setSaving] = useState(false);
  const searchRef = useRef(null);
  const sentinel = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const products = useInfiniteQuery({
    queryKey: ["telekhata-products", showroomId, debounced],
    initialPageParam: 1,
    staleTime: 0,
    queryFn: async ({ pageParam }) => {
      const qs = new URLSearchParams({ q: debounced, showroomId, page: String(pageParam) });
      const json = await (await fetch(`/api/telekhata/products?${qs}`)).json();
      if (!json.success) throw new Error(json.message);
      return json;
    },
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
  const list = useMemo(() => products.data?.pages.flatMap((page) => page.data) || [], [products.data]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && products.hasNextPage && !products.isFetchingNextPage) products.fetchNextPage();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [products]);

  const items = Object.entries(picked);
  const total = items.reduce((sum, [, item]) => sum + item.qty * item.price, 0);
  const count = items.reduce((sum, [, item]) => sum + item.qty, 0);
  const buyerType = normalizeCustomerType(party?.type);
  const linePrice = (product) => (type === "supplier" ? product.costPrice : rateForType(product, buyerType));

  const add = (product, step) =>
    setPicked((current) => {
      const next = { ...current };
      const qty = (next[product.variantId]?.qty || 0) + step;
      if (qty <= 0) delete next[product.variantId];
      else
        next[product.variantId] = {
          name: product.name,
          productId: product.productId,
          price: linePrice(product),
          qty,
        };
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      const summary = items.map(([, item]) => `${item.name} × ${item.qty}`).join(", ");
      const res = await fetch("/api/telekhata/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyType: type,
          partyId: id,
          direction,
          showroomId,
          kind: "goods",
          amount: total,
          note: [note, summary].filter(Boolean).join(" — ").slice(0, 300),
          date,
          items: items.map(([variantId, item]) => ({
            productId: item.productId,
            variantId,
            productName: item.name,
            qty: item.qty,
            price: item.price,
          })),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      showToast("success", json.message || "এন্ট্রি সেভ হয়েছে");
      onSaved();
    } catch (error) {
      showToast("error", error.message || "সেভ হয়নি");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen className="pb-4">
      <AppBar title="বাকি" onBack={onBack} />
      <div className="space-y-3 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-14 min-w-0 flex-1 items-center gap-2 rounded-lg border-2 border-[#1b56d8] bg-white px-3">
            <Search className="size-6 shrink-0 text-[#555]" />
            <input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="পণ্য খোঁজ করুন" className="min-w-0 flex-1 bg-transparent text-[16px] outline-none" />
            <span className="h-6 w-px bg-[#1b56d8]" />
            <span className="flex shrink-0 items-center gap-1 text-[16px]">ফিল্টার</span>
          </div>
          <button type="button" onClick={() => searchRef.current?.focus()} aria-label="বারকোড স্ক্যান" className="text-[#1b56d8]">
            <ScanBarcode className="size-9" />
          </button>
        </div>

        {products.isLoading && <p className="py-10 text-center text-sm text-[#777]">লোড হচ্ছে...</p>}
        {!products.isLoading && list.length === 0 && <p className="py-10 text-center text-sm text-[#777]">কোনো পণ্য পাওয়া যায়নি</p>}

        <div className="space-y-3">
          {list.map((product) => {
            const qty = picked[product.variantId]?.qty || 0;
            return (
              <PickCard
                key={product.variantId}
                on={qty > 0}
                qty={qty}
                onToggle={() => add(product, qty > 0 ? -qty : 1)}
                onStep={(step) => add(product, step)}
                image={<ProductImage product={product} />}
              >
                <p className={`m-0 text-[17px] font-bold leading-snug ${product.stock <= 0 ? "text-[#e0334c]" : "text-[#111]"}`}>{product.name}</p>
                <div className="mt-1 grid grid-cols-2 gap-1 text-[14px]">
                  <div>
                    <p className="m-0 text-[#666]">স্টক সংখ্যা</p>
                    <p className="m-0 font-bold">{bnNumber(product.stock)}</p>
                  </div>
                  <div className="text-right">
                    <p className="m-0 text-[#666]">{type === "supplier" ? "ক্রয় মূল্য" : RATE_LABEL[buyerType]}</p>
                    <p className="m-0 font-bold">{money(linePrice(product))}</p>
                  </div>
                </div>
              </PickCard>
            );
          })}
          <div ref={sentinel} className="h-6" />
        </div>
      </div>

      <div className="sticky bottom-0 z-30 flex items-center justify-between bg-[#1b56d8] px-4 py-4 text-white">
        <span className="text-[17px]">
          সর্বমোট: <b>৳ {bnNumber(total)}</b>
        </span>
        <button
          type="button"
          onClick={() => (count ? setConfirmOpen(true) : showToast("error", "আগে পণ্য বাছুন"))}
          className="flex h-12 min-w-[110px] items-center justify-center gap-4 rounded-lg bg-white px-4 text-[18px] font-bold text-[#111]"
        >
          {bnNumber(count)} <span>›</span>
        </button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-md">
          <DialogHeader className="border-b bg-[#f7f7f7] px-5 py-4">
            <DialogTitle className="text-[17px]">{party?.name} · পণ্য বাকী</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 px-5 py-4 text-[15px]">
            <div className="max-h-48 divide-y overflow-y-auto rounded-lg border">
              {items.map(([key, item]) => (
                <div key={key} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate">
                    {item.name} × {bnNumber(item.qty)}
                  </span>
                  <b>{money(item.qty * item.price)}</b>
                </div>
              ))}
            </div>
            <p className="m-0 text-right text-[17px]">
              মোট: <b>{money(total)}</b>
            </p>
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="নোট" maxLength={120} className="h-12 w-full rounded-lg border px-3 text-[15px]" />
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-12 w-full rounded-lg border px-3 text-[15px]" />
            <button type="button" disabled={saving} onClick={save} className="h-12 w-full rounded-lg bg-[#1b56d8] text-[17px] font-medium text-white disabled:opacity-60">
              {saving ? "সেভ হচ্ছে..." : "আপডেট"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Screen>
  );
}

export function ProductImage({ product }) {
  return product.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={product.image} alt="" className="size-14 shrink-0 rounded-full border-2 border-white bg-white object-cover shadow" />
  ) : (
    <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white shadow">
      <svg viewBox="0 0 40 40" className="size-9" aria-hidden="true">
        <circle cx="20" cy="9" r="5" fill="#f4b400" />
        <circle cx="12" cy="20" r="5" fill="#f4b400" />
        <circle cx="28" cy="20" r="5" fill="#f4b400" />
        <circle cx="20" cy="31" r="5" fill="#f4b400" />
        <path d="M8 20h24" stroke="#fff" strokeWidth="2" />
      </svg>
    </span>
  );
}
