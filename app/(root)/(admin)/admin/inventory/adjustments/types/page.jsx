"use client";

import Link from "next/link";

import { ListCard, btn } from "@/components/ui/Application/Admin/listKit";
import { ADMIN_INVENTORY_ADJUSTMENTS } from "@/Route/Adminpannelroute";

const TYPES = [
  {
    name: "Addition",
    detail: "Stock goes up at the current shop. Loss is 0.00.",
  },
  {
    name: "Deduction",
    detail: "Stock goes down. Cannot exceed stock on hand. Loss = qty × purchase rate.",
  },
];

export default function AdjustmentTypesPage() {
  return (
    <ListCard
      title="Adjustment Type List"
      actions={
        <Link href={ADMIN_INVENTORY_ADJUSTMENTS} className={btn.secondary}>
          Back to List
        </Link>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#00801a] text-white">
              <th className="border border-[#ebeff2] px-2 py-2 text-[13px] font-bold">Type</th>
              <th className="border border-[#ebeff2] px-2 py-2 text-[13px] font-bold">Description</th>
            </tr>
          </thead>
          <tbody>
            {TYPES.map((row) => (
              <tr key={row.name}>
                <td className="border border-[#edf0f3] px-2 py-2 text-[14px] font-semibold">
                  {row.name}
                </td>
                <td className="border border-[#edf0f3] px-2 py-2 text-[14px] text-[#495057]">
                  {row.detail}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ListCard>
  );
}
