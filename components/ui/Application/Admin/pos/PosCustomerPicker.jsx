"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Search, User, UserPlus, X, Plus } from "lucide-react";
import {
  setCustomer,
  clearCustomer,
} from "@/store/reducer/posCartSlice";
import { CUSTOMER_TYPES, normalizeCustomerType } from "@/lib/priceTiers";
import CustomerModal from "./CustomerModal";

const isPhone = (s) => /^01\d{9}$/.test(String(s).trim());

export default function PosCustomerPicker({ amarMobile = false, amarGuest = false }) {
  const dispatch = useDispatch();
  const customer = useSelector((state) => state.posCart?.customer);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/customer/search?q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        setResults(data.customers || []);
        setOpen(true);
      } catch {
        /* keep list */
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const close = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (c) => {
    dispatch(
      setCustomer({
        _id: c._id || null,
        name: c.name || "",
        phone: c.phone || "",
        address: c.address || "",
        type: normalizeCustomerType(c.type),
      }),
    );
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const inputClass =
    "h-8 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 text-[12px] outline-none focus:border-primary dark:border-white/10 dark:bg-transparent";

  if ((amarMobile || amarGuest) && !customer) {
    return (
      <div ref={boxRef} className="relative flex items-center gap-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-600">
          <User className="size-5" />
        </span>
        <select
          className="h-10 min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 text-[13px] font-medium text-gray-800"
          value=""
          onChange={(e) => {
            if (e.target.value === "find") setModalOpen(true);
          }}
        >
          <option value="">Guest</option>
          <option value="find">Find / add customer…</option>
        </select>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-sm"
          aria-label="Add customer"
        >
          <Plus className="size-5" strokeWidth={2.5} />
        </button>
        <CustomerModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onPick={pick}
          initialQuery={query}
        />
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      {customer ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-1.5">
          <div className="flex gap-1.5">
            <input
              value={customer.name}
              onChange={(e) =>
                dispatch(setCustomer({ ...customer, name: e.target.value }))
              }
              placeholder="Customer name"
              className={inputClass}
            />
            <input
              value={customer.phone}
              onChange={(e) =>
                dispatch(
                  setCustomer({ ...customer, _id: null, phone: e.target.value }),
                )
              }
              placeholder="01XXXXXXXXX"
              inputMode="tel"
              className={`${inputClass} max-w-32`}
            />
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              title="Change customer"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-primary/10"
            >
              <Search className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => dispatch(clearCustomer())}
              title="Walk-in customer"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <select
              value={normalizeCustomerType(customer.type)}
              onChange={(e) =>
                dispatch(setCustomer({ ...customer, type: e.target.value }))
              }
              className="h-7 rounded-md border border-gray-200 bg-white px-1.5 text-[11px] font-medium outline-none focus:border-primary dark:border-white/10 dark:bg-transparent"
            >
              {Object.entries(CUSTOMER_TYPES).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <label className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 focus-within:border-primary dark:border-white/10 dark:bg-transparent">
          <User className="size-4 text-primary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder="Customer (optional): name / phone"
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
          />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setModalOpen(true);
            }}
            className="-mr-2 flex h-7 items-center gap-1 rounded-md bg-primary/10 px-2 text-[11px] font-semibold text-primary hover:bg-primary/20"
          >
            <Search className="size-3.5" /> Find / Add
          </button>
        </label>
      )}

      <CustomerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onPick={pick}
        initialQuery={customer ? "" : query}
      />

      {open && !customer && query.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-card">
          {results.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => pick(c)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-primary/5"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium">{c.name}</span>
                <span className="text-[11px] text-gray-500">{c.phone}</span>
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              pick(
                isPhone(query)
                  ? { name: "", phone: query.trim() }
                  : { name: query.trim(), phone: "" },
              )
            }
            className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-[13px] font-medium text-primary hover:bg-primary/5"
          >
            <UserPlus className="size-4" />
            Add “{query.trim()}” as new customer
          </button>
        </div>
      )}
    </div>
  );
}
