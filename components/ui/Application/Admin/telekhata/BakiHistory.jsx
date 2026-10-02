"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { ADMIN_TELEKHATA_BAKI, ADMIN_TELEKHATA_PARTY } from "@/Route/Adminpannelroute";
import { useOpeningStockTill } from "@/lib/posProducts";
import { dateLabel, money } from "./telekhataKit";
import { AppBar, Screen } from "./tkUI";

// "Baki history": the latest lines of the whole book, newest first
export default function BakiHistory() {
  const till = useOpeningStockTill();
  const router = useRouter();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["telekhata-history", till.id],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const res = await fetch(`/api/telekhata/history?showroomId=${encodeURIComponent(till.id)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.rows;
    },
  });

  return (
    <Screen className="pb-6">
      <AppBar title="বাকির ইতিহাস" onBack={() => router.push(ADMIN_TELEKHATA_BAKI)} />
      <div className="space-y-3 p-3">
        {isLoading && <p className="py-8 text-center text-sm text-[#777]">লোড হচ্ছে...</p>}
        {isError && (
          <button type="button" onClick={() => refetch()} className="w-full py-8 text-center text-sm text-[#1b56d8] underline">
            লোড হয়নি। আবার চেষ্টা করুন
          </button>
        )}
        {!isLoading && !isError && (data || []).length === 0 && <p className="py-8 text-center text-sm text-[#777]">এখনো কোনো এন্ট্রি নেই</p>}

        {(data || []).map((row) => (
          <button
            key={row._id}
            type="button"
            onClick={() => router.push(ADMIN_TELEKHATA_PARTY(row.partyType, row.partyId))}
            className="flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-[16px] font-medium">{row.name}</p>
              <p className="m-0 text-[12px] text-[#666]">
                {dateLabel(row.date)}
                {row.kind === "goods" ? " · পণ্য বাকি" : ""}
              </p>
              {row.note && <p className="m-0 truncate text-[12px] text-[#666]">নোট: {row.note}</p>}
            </div>
            <div className="text-right">
              <p className={`m-0 text-[16px] font-bold ${row.direction === "take" ? "text-[#2e9b4a]" : "text-[#d9453c]"}`}>{money(row.amount)}</p>
              <p className="m-0 text-[12px] text-[#666]">{row.direction === "take" ? "নিয়েছি" : "দিয়েছি"}</p>
            </div>
          </button>
        ))}
      </div>
    </Screen>
  );
}
