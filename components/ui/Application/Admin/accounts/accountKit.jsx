"use client";

import { useQuery } from "@tanstack/react-query";

import { WAREHOUSE_TILL, posShowroomsQueryOptions, useOpeningStockTill, writePosShowroom } from "@/lib/posProducts";
import { oneLine } from "@/lib/labels";
import { filterInput } from "@/components/ui/Application/Admin/listKit";

// The account types of AmarSolution's Create Account page
export const ACCOUNT_TYPE_LIST = [
  ["cash", "Cash", "নগদ"],
  ["mobile_banking", "Mobile Banking", "মোবাইল ব্যাংকিং"],
  ["card", "Card", "কার্ড"],
  ["bank", "Bank Account", "ব্যাংক অ্যাকাউন্ট"],
  ["advance", "Advance", "অগ্রিম"],
  ["cheque", "Bank Cheque", "ব্যাংক চেক"],
];

export const typeLabel = (type, language) => {
  const row = ACCOUNT_TYPE_LIST.find(([key]) => key === type);
  return row ? oneLine(row[1], row[2], language) : type;
};

export const fmt = (value) =>
  Number(value || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const dateText = (value) =>
  new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export const today = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

/** The selected shop's accounts with their balances */
export function useAccounts() {
  const till = useOpeningStockTill();

  const query = useQuery({
    queryKey: ["accounts", till.id],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const res = await fetch(`/api/accounts?showroomId=${encodeURIComponent(till.id)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json;
    },
  });

  return { till, ...query, accounts: query.data?.data || [], total: query.data?.total || 0 };
}

/** The shop dropdown every admin list carries; it is the same switch as the top bar */
export function ShopSelect({ className = "" }) {
  const till = useOpeningStockTill();
  const { data: showrooms = [] } = useQuery(posShowroomsQueryOptions());

  return (
    <select
      value={till.id}
      onChange={(event) => writePosShowroom(event.target.value)}
      className={`${filterInput} !h-[44px] !w-[260px] max-w-full ${className}`}
    >
      {till.id === WAREHOUSE_TILL && <option value={WAREHOUSE_TILL}>Ware House</option>}
      {showrooms
        .filter((shop) => shop.isActive !== false)
        .map((shop) => (
          <option key={shop._id} value={shop._id}>
            {shop.name}
          </option>
        ))}
    </select>
  );
}

export const field = "h-[44px] w-full rounded-[6px] border border-[#e3e3e3] bg-white px-3 text-[14px] outline-none focus:border-[#188ae2] dark:border-input dark:bg-transparent";
