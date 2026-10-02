"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  FcApproval,
  FcBullish,
  FcBusinessman,
  FcCalculator,
  FcCollect,
  FcConferenceCall,
  FcCurrencyExchange,
  FcCustomerSupport,
  FcDeleteDatabase,
  FcDonate,
  FcExpired,
  FcInTransit,
  FcMoneyTransfer,
  FcPackage,
  FcPrint,
  FcSalesPerformance,
  FcSimCardChip,
  FcSms,
  FcStatistics,
  FcTodoList,
  FcViewDetails,
} from "react-icons/fc";
import { IoNotificationsOutline, IoChevronDown, IoHomeOutline, IoLogoWhatsapp, IoSettingsOutline } from "react-icons/io5";
import { LuCirclePlus, LuStore } from "react-icons/lu";

import {
  ADMIN_APP_SETTINGS,
  ADMIN_ASSET_SHOW,
  ADMIN_CUSTOMERS_SHOW,
  ADMIN_EXPENSE_SHOW,
  ADMIN_INVENTORY_STOCK,
  ADMIN_PRODUCT_SHOW,
  ADMIN_PURCHASE_SHOW,
  ADMIN_REPORTS,
  ADMIN_SALES,
  ADMIN_TELEKHATA_BAKI,
  ADMIN_TELEKHATA_BECHA,
  ADMIN_TELEKHATA_KENA,
  ADMIN_TRASH,
  ADMIN_USERS,
} from "@/Route/Adminpannelroute";
import { posShowroomsQueryOptions, useOpeningStockTill, writePosShowroom, WAREHOUSE_TILL } from "@/lib/posProducts";
import { showToast } from "@/lib/showToast";
import { bnNumber, money, t } from "./telekhataKit";
import { Screen } from "./tkUI";

const SOON = "Coming soon";

// One icon + label, exactly like the khata grids of the app
function Tile({ href, icon: Icon, label, onClick }) {
  const body = (
    <>
      <Icon className="size-[46px]" />
      <span className="text-center text-[13px] font-medium leading-tight text-[#2b2b2b] dark:text-foreground">{label}</span>
    </>
  );
  const cls = "flex flex-col items-center gap-1.5 rounded-lg px-1 py-2 transition active:scale-95";

  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#dcdcdc] bg-white dark:border-white/10 dark:bg-card">
      <h2 className="m-0 border-b border-[#e6e6e6] px-3 py-2 text-[13px] font-medium text-[#444] dark:border-white/10 dark:text-muted-foreground">
        {title}
      </h2>
      <div className="grid grid-cols-4 gap-y-3 px-1 py-3">{children}</div>
    </section>
  );
}

// Telekhata home: a clone of the app's home screen
export default function TelekhataHome() {
  const till = useOpeningStockTill();
  const [period, setPeriod] = useState("day");
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: showrooms = [] } = useQuery(posShowroomsQueryOptions());

  const { data } = useQuery({
    queryKey: ["telekhata-summary", till.id, period],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const qs = new URLSearchParams({ showroomId: till.id, period });
      const res = await fetch(`/api/telekhata/summary?${qs}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json;
    },
  });

  const soon = () => showToast("info", t(SOON, "শীঘ্রই আসছে"));

  return (
    <Screen className="pb-2">
      {/* yellow header */}
      <header className="rounded-b-2xl bg-[#fdc82f] px-3 pb-3 pt-3 text-[#1d1d1d] shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <label className="relative flex min-w-0 items-center gap-1">
            <select
              value={till.id}
              onChange={(event) => writePosShowroom(event.target.value)}
              className="max-w-[230px] cursor-pointer appearance-none truncate bg-transparent pr-5 text-[17px] font-bold outline-none"
              aria-label="দোকান"
            >
              {till.id === WAREHOUSE_TILL && <option value={WAREHOUSE_TILL}>{t("Ware House", "ওয়্যারহাউস")}</option>}
              {showrooms
                .filter((s) => s.isActive !== false)
                .map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
            </select>
            <IoChevronDown className="pointer-events-none absolute right-0 size-4" />
          </label>
          <div className="flex shrink-0 items-center gap-3">
            <a href="https://wa.me/" target="_blank" rel="noreferrer" aria-label="হোয়াটসঅ্যাপ">
              <IoLogoWhatsapp className="size-7" />
            </a>
            <button type="button" onClick={soon} aria-label="নোটিফিকেশন">
              <IoNotificationsOutline className="size-7" />
            </button>
            <div className="relative">
              <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="সেটিংস">
                <IoSettingsOutline className="size-7" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-9 z-40 w-48 overflow-hidden rounded-lg border bg-white text-[15px] shadow-lg">
                  <Link href={ADMIN_APP_SETTINGS} className="block px-4 py-3 hover:bg-[#f4f4f4]">
                    সেটিংস
                  </Link>
                  <Link href="/admin/dashboard" className="block border-t px-4 py-3 hover:bg-[#f4f4f4]">
                    অ্যাডমিন প্যানেলে যান
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="m-0 text-[12px] leading-tight">
            {t("Last backup", "সর্বশেষ ব্যাকআপ")}: —<br />
            {new Date().toLocaleString("bn-BD", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}
          </p>
          <button type="button" onClick={soon} className="rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold shadow-sm">
            {t("Data backup", "ডাটা ব্যাকআপ")}
          </button>
        </div>
      </header>

      <div className="space-y-3 p-3">
        {/* summary card */}
        <div className="rounded-xl border border-[#dcdcdc] bg-white p-3 dark:border-white/10 dark:bg-card">
          <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 border-b pb-3">
            <div className="text-center">
              <p className="m-0 text-[14px]">{t("Balance", "ব্যালেন্স")}</p>
              <p className={`m-0 text-[17px] font-bold ${(data?.balance || 0) < 0 ? "text-[#d6403a]" : "text-[#2e9b4a]"}`}>{money(data?.balance)}</p>
            </div>
            <div className="text-center">
              <p className="m-0 text-[14px]">{period === "day" ? t("Today's sale", "আজকের বিক্রি") : t("This month's sale", "এই মাসের বিক্রি")}</p>
              <p className="m-0 text-[17px] font-bold text-[#1f4fd8]">{money(data?.sale)}</p>
            </div>
            <div className="flex overflow-hidden rounded-lg bg-[#ececec] p-0.5 text-[14px] font-semibold">
              {[
                ["day", t("Day", "দিন")],
                ["month", t("Month", "মাস")],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPeriod(key)}
                  className={`rounded-md px-3.5 py-1.5 ${period === key ? "bg-[#1f4fd8] text-white" : "text-[#444]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 items-start gap-2 pt-3">
            <div className="text-center">
              <p className="m-0 text-[14px]">{period === "day" ? t("Today's expense", "আজকের ব্যয়") : t("This month's expense", "এই মাসের ব্যয়")}</p>
              <p className="m-0 text-[17px] font-bold text-[#d6403a]">{money(data?.expense)}</p>
            </div>
            <div className="border-x text-center">
              <p className="m-0 text-[14px]">{t("Baki", "বাকি")}</p>
              <div className="grid grid-cols-2 gap-1 text-[12px]">
                <div>
                  <p className="m-0 text-[#d6403a]">{t("Given", "দিয়েছি")}</p>
                  <p className="m-0 font-bold text-[#d6403a]">{money(data?.given)}</p>
                </div>
                <div>
                  <p className="m-0 text-[#2e9b4a]">{t("Taken", "নিয়েছি")}</p>
                  <p className="m-0 font-bold text-[#2e9b4a]">{money(data?.taken)}</p>
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="m-0 text-[14px]">{t("Stock count", "স্টক সংখ্যা")}</p>
              <p className="m-0 text-[17px] font-bold text-[#2e9b4a]">{bnNumber(data?.stock)}</p>
            </div>
          </div>
        </div>

        {/* Kena / Becha */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#dcdcdc] bg-white p-2.5 dark:border-white/10 dark:bg-card">
          <Link href={ADMIN_TELEKHATA_KENA} className="flex flex-col items-center gap-1 rounded-lg bg-[#f1f1f1] py-4 transition active:scale-95 dark:bg-muted">
            <FcInTransit className="size-12" />
            <span className="text-[16px] font-medium">{t("Kena", "কেনা")}</span>
          </Link>
          <Link href={ADMIN_TELEKHATA_BECHA} className="flex flex-col items-center gap-1 rounded-lg bg-[#f1f1f1] py-4 transition active:scale-95 dark:bg-muted">
            <FcSalesPerformance className="size-12" />
            <span className="text-[16px] font-medium">{t("Becha", "বেচা")}</span>
          </Link>
        </div>

        <Section title={t("Khata", "খাতা সমূহ")}>
          <Tile href={ADMIN_PURCHASE_SHOW} icon={FcTodoList} label={t("Kenar Khata", "কেনার খাতা")} />
          <Tile href={ADMIN_SALES} icon={FcCalculator} label={t("Becha Khata", "বেচার খাতা")} />
          <Tile href={ADMIN_TELEKHATA_BAKI} icon={FcViewDetails} label={t("Baki Khata", "বাকির খাতা")} />
          <Tile href={ADMIN_EXPENSE_SHOW} icon={FcMoneyTransfer} label={t("Khoroch Khata", "খরচের খাতা")} />
        </Section>

        <Section title={t("For your business", "আপনার ব্যবসার জন্য")}>
          <Tile href={ADMIN_CUSTOMERS_SHOW} icon={FcConferenceCall} label={t("Contacts", "যোগাযোগ")} />
          <Tile href={ADMIN_PRODUCT_SHOW} icon={FcPackage} label={t("Product list", "প্রোডাক্ট লিস্ট")} />
          <Tile href={ADMIN_INVENTORY_STOCK} icon={FcCollect} label={t("Stock", "স্টকের হিসাব")} />
          <Tile href={ADMIN_REPORTS} icon={FcStatistics} label={t("Reports", "ব্যবসার রিপোর্ট")} />
        </Section>

        <Section title={t("Others", "অন্যান্য")}>
          <Tile href={ADMIN_REPORTS} icon={FcCurrencyExchange} label={t("Cashbox", "ক্যাশবক্স")} />
          <Tile href={ADMIN_USERS} icon={FcBusinessman} label={t("App access", "অ্যাপ অ্যাক্সেস")} />
          <Tile onClick={soon} icon={FcSms} label={t("Marketing", "মার্কেটিং")} />
          <Tile onClick={soon} icon={FcSimCardChip} label={t("Top up", "টপ আপ")} />
          <Tile href="/admin/warranty" icon={FcApproval} label={t("Warranty", "ওয়ারেন্টি")} />
          <Tile href={ADMIN_INVENTORY_STOCK} icon={FcExpired} label={t("Expired products", "মেয়াদোত্তীর্ণ পণ্য")} />
          <Tile href={ADMIN_APP_SETTINGS} icon={FcPrint} label={t("Printer", "প্রিন্টার")} />
          <Tile href={ADMIN_ASSET_SHOW} icon={FcDonate} label={t("Capital", "পুঁজি")} />
          <Tile onClick={soon} icon={FcCustomerSupport} label={t("App training", "অ্যাপ ট্রেনিং")} />
          <Tile onClick={soon} icon={FcBullish} label={t("Growth partner", "গ্রোথ পার্টনার")} />
          <Tile href={ADMIN_TRASH} icon={FcDeleteDatabase} label={t("Recycle bin", "রিসাইকেল বিন")} />
        </Section>

        {/* live chat card */}
        <div className="flex items-center gap-3 rounded-xl border border-[#dcdcdc] bg-white p-3 dark:border-white/10 dark:bg-card">
          <IoLogoWhatsapp className="size-11 shrink-0 text-[#25d366]" />
          <p className="m-0 min-w-0 flex-1 text-[14px] leading-snug">
            {t("Need help? Get help from an expert", "যেকোনো প্রয়োজনে এক্সপার্টের কাছ থেকে সহায়তা নিন")}
          </p>
          <a href="https://wa.me/" target="_blank" rel="noreferrer" className="shrink-0 rounded-lg bg-[#1f4fd8] px-4 py-2.5 text-[14px] font-bold text-white">
            {t("Live chat", "লাইভ চ্যাট")}
          </a>
        </div>
      </div>

      {/* bottom navigation */}
      <nav className="sticky bottom-0 z-20 grid grid-cols-3 border-t bg-white text-[13px] dark:bg-card">
        <Link href="/" className="flex flex-col items-center gap-0.5 py-2 text-[#777]">
          <LuStore className="size-6" />
          {t("Online shop", "অনলাইন শপ")}
        </Link>
        <span className="flex flex-col items-center gap-0.5 border-t-4 border-[#fdc82f] bg-[#fff6d6] py-1.5 font-semibold text-[#1d1d1d]">
          <IoHomeOutline className="size-6" />
          {t("Home", "হোম")}
        </span>
        <button type="button" onClick={soon} className="flex flex-col items-center gap-0.5 py-2 text-[#777]">
          <LuCirclePlus className="size-6" />
          {t("Extra income", "বাড়তি আয়")}
        </button>
      </nav>
    </Screen>
  );
}
