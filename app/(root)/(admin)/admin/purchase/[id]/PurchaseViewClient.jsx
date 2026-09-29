"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import axios from "axios";

import { showToast } from "@/lib/showToast";
import { ADMIN_PURCHASE_SHOW } from "@/Route/Adminpannelroute";
import { PurchasePayDialog } from "@/components/ui/Application/Admin/purchase/purchaseKit";
import PurchaseReceipt from "@/components/PurchaseReceipt";

/** Purchase invoice actions and refresh; data is loaded on the server. */
export default function PurchaseViewClient({ purchase: initial, company, autoPrint = false }) {
  const [p, setP] = useState(initial);
  const [paying, setPaying] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/purchase/${p._id}`);
      if (!data.success) return showToast("error", data.message || "Could not refresh");
      setP(data.data);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Could not refresh");
    }
  }, [p._id]);

  const receive = async () => {
    if (!confirm(`Receive ${p.purchaseNumber}? Stock will increase.`)) return;
    setBusy(true);
    try {
      const { data } = await axios.post(`/api/purchase/receive/${p._id}`, {});
      if (!data.success) return showToast("error", data.message || "Could not receive");
      showToast("success", "Stock updated");
      load();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Could not receive");
    } finally {
      setBusy(false);
    }
  };

  const toolBtn = "rounded px-3 py-1.5 text-[12px] font-medium text-white transition disabled:opacity-60";

  return (
    <>
      <PurchaseReceipt
        purchase={p}
        company={company}
        autoPrint={autoPrint}
        toolbarStart={
          <>
            <Link href={ADMIN_PURCHASE_SHOW} className={`${toolBtn} bg-gray-500 hover:bg-gray-600`}>
              Back
            </Link>
            {p.status === "pending" && (
              <button type="button" className={`${toolBtn} bg-emerald-600 hover:bg-emerald-700`} disabled={busy} onClick={receive}>
                Receive
              </button>
            )}
            {p.status !== "cancelled" && p.dueAmount > 0 && (
              <button type="button" className={`${toolBtn} bg-amber-500 hover:bg-amber-600`} onClick={() => setPaying(p)}>
                Pay Due
              </button>
            )}
          </>
        }
      />
      <PurchasePayDialog purchase={paying} onClose={() => setPaying(null)} onDone={load} />
    </>
  );
}
