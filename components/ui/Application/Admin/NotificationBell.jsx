"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { AlertTriangle, Bell, CalendarClock, Store } from "lucide-react";

import { formatNumberBD } from "@/lib/bdFormat";
import { ADMIN_INVENTORY_STOCK, ADMIN_SUPPLIER_SCHEDULE } from "@/Route/Adminpannelroute";

const REFRESH_MS = 60_000;

const when = (value) => {
  const d = new Date(value);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
};

function Section({ title, count, children, footer }) {
  if (!count) return null;
  return (
    <div className="border-b border-[#eef1f4] last:border-b-0 dark:border-border">
      <div className="flex items-center justify-between bg-[#fafbfc] px-[14px] py-[7px] dark:bg-muted">
        <b className="text-[12.5px] text-[#212529] dark:text-foreground">{title}</b>
        <span className="rounded-full bg-[#ff5b5b] px-[7px] text-[11px] font-bold text-white">{count}</span>
      </div>
      {children}
      {footer}
    </div>
  );
}

const rowClass =
  "flex gap-[10px] border-b border-[#f3f5f7] px-[14px] py-[9px] text-inherit no-underline transition-colors last:border-b-0 hover:bg-[#f7f9fb] dark:border-border dark:hover:bg-muted";
const moreClass = "block px-[14px] py-[7px] text-center text-[12.5px] font-medium text-[#188ae2] no-underline hover:bg-[#f1f7fd] dark:hover:bg-muted";

/**
 * Header bell, like 360's: supplier schedules due today or overdue, new
 * dealer / sub dealer / wholesaler orders to accept, and low stock.
 */
export default function NotificationBell() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  // refresh now and every minute, and whenever the list is opened
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      axios
        .get("/api/notifications")
        .then(({ data: res }) => !cancelled && res.success && setData(res))
        .catch(() => {});
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    const esc = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const count = data?.count || 0;
  const done = () => setOpen(false);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={count ? `${count} notifications` : "Notifications"}
        className="relative flex size-9 items-center justify-center rounded-full text-white hover:bg-white/10"
      >
        <Bell className="size-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#ff5b5b] px-[4px] text-[10px] font-bold leading-none text-white ring-2 ring-sidebar">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[46px] z-50 w-[340px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[8px] border border-black/10 bg-white text-[#212529] shadow-[0_10px_30px_rgba(20,30,50,0.14)] dark:bg-popover dark:text-foreground">
          <div className="flex items-center justify-between border-b border-[#eef1f4] px-[14px] py-[10px] dark:border-border">
            <b className="text-[14px]">Notifications</b>
            <span className="text-[12px] text-[#6c757d]">{count ? `${count} need attention` : "All clear"}</span>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {!count && <p className="m-0 px-[14px] py-[22px] text-center text-[13px] text-[#6c757d]">Nothing needs attention right now.</p>}

            <Section
              title="New dealer orders to accept"
              count={data?.partnerOrders.count}
              footer={
                <Link href="/admin/partner-orders" onClick={done} className={moreClass}>
                  Open all orders
                </Link>
              }
            >
              {data?.partnerOrders.data.map((o) => (
                <Link key={o._id} href="/admin/partner-orders" onClick={done} className={rowClass}>
                  <Store size={17} className="mt-[2px] shrink-0 text-[#00801a]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <b className="truncate text-[13px]">{o.name}</b>
                      <span className="shrink-0 text-[12px] font-semibold">৳{formatNumberBD(o.total)}</span>
                    </span>
                    <span className="block text-[12px] text-[#6c757d]">
                      {o.orderNumber} · {o.type} · {when(o.createdAt)}
                    </span>
                  </span>
                </Link>
              ))}
            </Section>

            <Section
              title="Supplier schedules"
              count={data?.schedules.count}
              footer={
                <Link href={ADMIN_SUPPLIER_SCHEDULE} onClick={done} className={moreClass}>
                  View all schedules
                </Link>
              }
            >
              {data?.schedules.data.map((s) => (
                <Link key={s._id} href={ADMIN_SUPPLIER_SCHEDULE} onClick={done} className={rowClass}>
                  <CalendarClock size={17} className="mt-[2px] shrink-0 text-[#188ae2]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <b className="truncate text-[13px]">{s.supplier}</b>
                      <span className={`shrink-0 rounded-[4px] px-[6px] py-[1px] text-[11px] font-semibold ${s.overdue ? "bg-[#fff1f1] text-[#d63939]" : "bg-[#fff6dd] text-[#9a6a00]"}`}>
                        {s.overdue ? "Overdue" : "Today"}
                      </span>
                    </span>
                    <span className="block text-[12px] text-[#6c757d]">
                      {when(s.scheduledAt)}
                      {s.purpose && ` · ${s.purpose}`}
                    </span>
                  </span>
                </Link>
              ))}
            </Section>

            <Section
              title="Low stock"
              count={data?.lowStock.count}
              footer={
                <Link href="/admin/reports/low-stock-product-report" onClick={done} className={moreClass}>
                  Low stock report
                </Link>
              }
            >
              {data?.lowStock.data.map((v) => (
                <Link key={v._id} href={ADMIN_INVENTORY_STOCK} onClick={done} className={rowClass}>
                  <AlertTriangle size={17} className="mt-[2px] shrink-0 text-[#f5a623]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <b className="truncate text-[13px]">{v.name}</b>
                      <span className={`shrink-0 text-[12px] font-semibold ${v.stock <= 0 ? "text-[#d63939]" : "text-[#9a6a00]"}`}>
                        {v.stock <= 0 ? "Out of stock" : `${v.stock} left`}
                      </span>
                    </span>
                    {v.alert > 0 && <span className="block text-[12px] text-[#6c757d]">Alert at {v.alert}</span>}
                  </span>
                </Link>
              ))}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
