"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import axios from "axios";

import TransferReceipt from "@/components/TransferReceipt";
import { showToast } from "@/lib/showToast";
import { useOpeningStockTill } from "@/lib/posProducts";

export default function TransferBillPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-[420px] max-w-[860px] animate-pulse rounded-[8px] bg-white" />}>
      <TransferBill />
    </Suspense>
  );
}

function TransferBill() {
  const { id } = useParams();
  const params = useSearchParams();
  const till = useOpeningStockTill();
  const [transfer, setTransfer] = useState(null);
  const [company, setCompany] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/inventory/transfers/${id}`);
      if (!data.success) return setError(data.message || "Transfer not found");
      setTransfer(data.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load transfer");
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
          logo: s.logo || "",
        });
      })
      .catch(() => {});
  }, []);

  const isReceiver =
    transfer?.status === "pending" &&
    till.id &&
    till.id !== "warehouse" &&
    String(transfer.toId) === String(till.id);

  const runAction = async (kind) => {
    if (!transfer || !isReceiver) return;

    const labels = {
      confirm: {
        ask: `Confirm ${transfer.transferNumber}? Stock will enter ${transfer.toName}.`,
        url: `/api/inventory/transfers/${transfer._id}/receive`,
        ok: "Transfer confirmed",
      },
      reject: {
        ask: `Reject ${transfer.transferNumber}? Stock will return to ${transfer.fromName}.`,
        url: `/api/inventory/transfers/${transfer._id}/reject`,
        ok: "Transfer rejected",
      },
    };

    const step = labels[kind];
    if (!step || !window.confirm(step.ask)) return;

    setBusy(kind);

    try {
      const { data } = await axios.post(step.url, { showroomId: till.id });

      if (!data.success) {
        showToast("error", data.message || "Could not update transfer");
        return;
      }

      showToast("success", data.message || step.ok);
      setTransfer(data.data);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Could not update transfer");
    } finally {
      setBusy("");
    }
  };

  const toolBtn =
    "rounded px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition disabled:opacity-60";

  if (error && !transfer) {
    return (
      <p className="rounded-[8px] bg-white p-6 text-center text-[#ff5b5b]" role="alert">
        {error}
      </p>
    );
  }

  if (!transfer) {
    return <div className="mx-auto h-[420px] max-w-[860px] animate-pulse rounded-[8px] bg-white" />;
  }

  return (
    <TransferReceipt
      transfer={transfer}
      company={company}
      autoPrint={params.get("print") === "1"}
      toolbarStart={
        isReceiver ? (
          <>
            <button
              type="button"
              className={`${toolBtn} bg-[#10c469] hover:bg-[#0db863]`}
              disabled={!!busy}
              onClick={() => runAction("confirm")}
            >
              {busy === "confirm" ? "Confirming…" : "Make Confirmed"}
            </button>
            <button
              type="button"
              className={`${toolBtn} bg-[#6c757d] hover:bg-[#5a6268]`}
              disabled={!!busy}
              onClick={() => runAction("reject")}
            >
              {busy === "reject" ? "Rejecting…" : "Make Rejected"}
            </button>
          </>
        ) : null
      }
    />
  );
}
