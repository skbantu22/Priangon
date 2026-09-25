"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Printer,
} from "lucide-react";

/**
 * The list-screen look shared by the stock and supplier pages: a card with
 * a faint title strip, 38px filter controls, a green table head, a grey
 * totals row and coloured export boxes.
 */

export const filterInput =
  "h-[38px] w-full rounded-[6px] border border-[#e3e3e3] bg-white px-[12px] text-[13px] text-[#495057] outline-none transition focus:border-[#188ae2] focus:ring-2 focus:ring-[#188ae2]/15 dark:border-input dark:bg-transparent dark:text-foreground";

const BTN =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] border text-[13px] leading-[19.5px] text-white shadow-[0_1px_2px_rgba(16,24,40,0.08)] transition duration-150 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#188ae2]/40 disabled:cursor-not-allowed disabled:opacity-60";

export const btn = {
  primary: `${BTN} border-[#188ae2] bg-[#188ae2] px-[14px] py-[6px] hover:border-[#1379c7] hover:bg-[#1379c7]`,
  info: `${BTN} border-[#35b8e0] bg-[#35b8e0] px-[14px] py-[8px] hover:border-[#22a6cf] hover:bg-[#22a6cf]`,
  warning: `${BTN} border-[#f9c851] bg-[#f9c851] px-[14px] py-[8px] hover:border-[#f0b93a] hover:bg-[#f0b93a]`,
  success: `${BTN} border-[#10c469] bg-[#10c469] px-[16px] py-[7px] hover:border-[#0dab5b] hover:bg-[#0dab5b]`,
  secondary: `${BTN} border-[#868e96] bg-[#868e96] px-[16px] py-[7px] hover:border-[#727b84] hover:bg-[#727b84]`,
  danger: `${BTN} border-[#ff5b5b] bg-[#ff5b5b] px-[14px] py-[6px] hover:border-[#f24242] hover:bg-[#f24242]`,
};

export const theadClass = "bg-[#00801a] text-white";
export const thClass =
  "whitespace-nowrap border border-[#ebeff2] px-[8px] py-[7px] text-left align-middle text-[13px] font-bold text-white dark:border-border";
export const tdClass =
  "border border-[#edf0f3] px-[8px] py-[7px] align-middle text-[14px] tabular-nums text-[#212529] dark:border-border dark:text-foreground";
export const totalRowClass =
  "bg-[#cbd5e1] text-[15px] font-bold text-[#212529] dark:bg-slate-700 dark:text-slate-100 [&>td]:py-[9px]";

/** Card with a faint header strip holding the title and the action buttons */
export function ListCard({ title, actions, children, bodyClass = "p-[20px]" }) {
  return (
    <section className="rounded-[8px] border border-[#e6ebf1] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_2px_8px_rgba(16,24,40,0.04)] dark:border-border dark:bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-t-[8px] border-b border-[#eef1f4] bg-gradient-to-r from-[#f7f9fb] to-white px-[20px] py-[13px] dark:border-border dark:from-muted dark:to-card">
        <h1 className="m-0 flex items-center gap-[10px] text-[19px] font-semibold leading-[1.3] text-[#212529] before:block before:h-[18px] before:w-[4px] before:rounded-full before:bg-[#1bab70] before:content-[''] dark:text-foreground">
          {title}
        </h1>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

/** Two date inputs with the blue "To" chip between them */
export function DateRange({ start, end, onStart, onEnd, className = "" }) {
  return (
    <div className={`flex items-center ${className}`}>
      <input
        type="date"
        aria-label="From date"
        value={start}
        onChange={(event) => onStart(event.target.value)}
        className={`${filterInput} min-w-0 rounded-r-none`}
      />
      <span className="flex h-[38px] shrink-0 items-center bg-[#188ae2] px-[10px] text-[12px] text-white">
        To
      </span>
      <input
        type="date"
        aria-label="To date"
        value={end}
        onChange={(event) => onEnd(event.target.value)}
        className={`${filterInput} min-w-0 rounded-l-none`}
      />
    </div>
  );
}

/** PDF · Excel · Print as small coloured icon boxes */
export function ExportButtons({ onPdf, onExcel, onPrint, disabled }) {
  const box =
    "flex h-[34px] w-[34px] items-center justify-center rounded-[4px] text-white shadow-sm transition hover:brightness-110 disabled:opacity-60";

  return (
    <div className="flex items-center gap-[6px]">
      <button type="button" disabled={disabled} onClick={onPdf} title="PDF" aria-label="Export PDF" className={`${box} bg-[#e74c3c]`}>
        <FileText size={17} />
      </button>
      <button type="button" disabled={disabled} onClick={onExcel} title="Excel" aria-label="Export Excel" className={`${box} bg-[#1d6f42]`}>
        <FileSpreadsheet size={17} />
      </button>
      <button type="button" disabled={disabled} onClick={onPrint} title="Print" aria-label="Print" className={`${box} bg-[#3d5afe]`}>
        <Printer size={17} />
      </button>
    </div>
  );
}

/** "Showing 1 To 10 Of 58 Entries" and the page buttons */
export function Pagination({ page, pages, from, count, total, onPage }) {
  const numbers = [];

  for (let p = Math.max(1, page - 2); p <= Math.min(pages, page + 2); p++) numbers.push(p);

  const item =
    "-ml-px flex h-[32px] min-w-[32px] items-center justify-center border border-[#dee2e6] bg-white px-2 text-[13px] text-[#188ae2] first:ml-0 first:rounded-l-[4px] last:rounded-r-[4px] hover:bg-[#f1f5f9] disabled:text-[#adb5bd] disabled:hover:bg-white dark:border-border dark:bg-transparent";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-[14px] text-[14px]">
      <span>
        Showing {total ? from : 0} To {total ? from + count - 1 : 0} Of {total} Entries
      </span>

      {pages > 1 && (
        <div className="flex">
          <button type="button" className={item} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
            <ChevronLeft size={15} />
          </button>
          {numbers.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              aria-current={p === page ? "page" : undefined}
              className={`${item} ${p === page ? "!border-[#188ae2] !bg-[#188ae2] !text-white" : ""}`}
            >
              {p}
            </button>
          ))}
          <button type="button" className={item} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Row "Action" dropdown. items: [label, onClick, tone?].
 * The menu is portalled to <body>, so a scrolling table cannot clip it.
 */
export function ActionMenu({ items, label = "Action" }) {
  const [pos, setPos] = useState(null);
  const button = useRef(null);
  const menu = useRef(null);
  const list = items.filter(Boolean);

  useEffect(() => {
    if (!pos) return undefined;

    const close = (event) => {
      if (!button.current?.contains(event.target) && !menu.current?.contains(event.target)) setPos(null);
    };
    const esc = (event) => {
      if (event.key === "Escape") setPos(null);
    };
    const dismiss = (event) => {
      if (!menu.current?.contains(event.target)) setPos(null);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);

    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [pos]);

  const toggle = () => {
    if (pos) {
      setPos(null);
      return;
    }

    const rect = button.current.getBoundingClientRect();
    const height = Math.min(list.length * 33 + 10, window.innerHeight - 16);

    // Below when it fits, otherwise above; always inside the viewport
    const below = window.innerHeight - rect.bottom - 8 >= height;
    const top = below ? rect.bottom + 4 : Math.max(8, rect.top - height - 4);

    setPos({
      top,
      right: Math.max(8, window.innerWidth - rect.right),
      maxHeight: window.innerHeight - top - 8,
    });
  };

  return (
    <div className="inline-block text-left">
      <button
        ref={button}
        type="button"
        onClick={toggle}
        aria-expanded={Boolean(pos)}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1 rounded-[4px] border border-[#35b8e0] bg-[#35b8e0] px-[10px] py-[5px] text-[11px] leading-[16.5px] text-white hover:bg-[#22a6cf]"
      >
        {label} <ChevronDown size={12} />
      </button>

      {pos &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            style={{ top: pos.top, right: pos.right, maxHeight: pos.maxHeight }}
            className="fixed z-[70] min-w-[170px] overflow-y-auto rounded-[6px] border border-black/10 bg-white py-[4px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:bg-popover"
          >
            {list.map(([text, onClick, tone]) => (
              <button
                key={text}
                type="button"
                role="menuitem"
                onClick={() => {
                  setPos(null);
                  onClick();
                }}
                className={`block w-full whitespace-nowrap px-[20px] py-[7px] text-left text-[13px] hover:bg-[#f1f7fd] dark:hover:bg-muted ${
                  tone === "danger" ? "text-[#ff5b5b]" : "text-[#212529] dark:text-foreground"
                }`}
              >
                {text}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Friendly empty state inside a table body */
export function EmptyRow({ colSpan, title = "No data found", hint }) {
  return (
    <tr>
      <td colSpan={colSpan} className="border border-[#ebeff2] px-4 py-[42px] text-center dark:border-border">
        <p className="m-0 text-[15px] font-medium text-[#495057] dark:text-foreground">{title}</p>
        {hint && <p className="m-0 mt-1 text-[13px] text-[#98a6ad]">{hint}</p>}
      </td>
    </tr>
  );
}
