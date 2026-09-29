"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import axios from "axios";

import { showToast } from "@/lib/showToast";
import { ADMIN_PURCHASE_SHOW } from "@/Route/Adminpannelroute";
import { PurchasePayDialog } from "@/components/ui/Application/Admin/purchase/purchaseKit";
import PurchaseReceipt from "@/components/PurchaseReceipt";

export default function PurchaseViewPage() {
  return (
    <Suspense fallback={<div className="h-[420px] animate-pulse rounded-[8px] bg-white dark:bg-card" />}>
      <PurchaseView />
    </Suspense>
  );
}

/** Purchase invoice as an A4 supplier bill */
function PurchaseView() {
  const { id } = useParams();
  const params = useSearchParams();
  const [p, setP] = useState(null);
  const [company, setCompany] = useState({});
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/purchase/${id}`);
      if (!data.success) return setError(data.message || "Purchase not found");
      setP(data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load the purchase");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    axios
      .get("/api/settings")
      .then(({ data }) => {
        if (!data.success || !data.data) return;
        const s = data.data;
        setCompany({
          name: s.companyName || "",
          address: s.address || "",
          phone: s.phone || "",
          email: s.email || "",
          bin: s.bin || "",
          mushakFormNo: s.mushakFormNo || "",
          showMushakLine: !!s.showMushakLine,
        });
      })
      .catch(() => {});
  }, []);

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

  if (error && !p) {
    return (
      <p className="rounded-[8px] bg-white p-6 text-center text-[#ff5b5b] dark:bg-card" role="alert">
        {error}
      </p>
    );
  }
  if (!p) return <div className="mx-auto h-[420px] max-w-[860px] animate-pulse rounded-[8px] bg-white dark:bg-card" />;

  const toolBtn = "rounded px-3 py-1.5 text-[12px] font-medium text-white transition disabled:opacity-60";

  return (
    <>
      <PurchaseReceipt
        purchase={p}
        company={company}
        autoPrint={params.get("print") === "1"}
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
