"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import axios from "axios";

import TransferReceipt from "@/components/TransferReceipt";
import { showToast } from "@/lib/showToast";
import { useOpeningStockTill } from "@/lib/posProducts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const cancelBtn =
  "inline-flex items-center justify-center rounded-[6px] border border-[#dee2e6] bg-white px-4 py-2 text-[13px] font-semibold text-[#495057] shadow-sm transition hover:bg-[#f8f9fa]";
const toolBtn =
  "rounded px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition disabled:opacity-60";

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
  const [pendingKind, setPendingKind] = useState("");

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

  const actionCopy = {
    confirm: {
      title: "Confirm transfer",
      body: transfer
        ? `Confirm ${transfer.transferNumber}? Stock will enter ${transfer.toName || "your shop"}.`
        : "",
      label: "Confirm",
      tone: "bg-[#10c469] hover:bg-[#0db863]",
    },
    reject: {
      title: "Reject transfer",
      body: transfer
        ? `Reject ${transfer.transferNumber}? Stock will return to ${transfer.fromName || "the sender"}.`
        : "",
      label: "Reject",
      tone: "bg-[#ff5b5b] hover:bg-[#f24242]",
    },
  };

  const runAction = async (kind) => {
    if (!transfer || !isReceiver) return;

    const labels = {
      confirm: {
        url: `/api/inventory/transfers/${transfer._id}/receive`,
        ok: "Transfer confirmed",
      },
      reject: {
        url: `/api/inventory/transfers/${transfer._id}/reject`,
        ok: "Transfer rejected",
      },
    };

    const step = labels[kind];
    if (!step) return;

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

  const confirmPending = () => {
    if (!pendingKind || busy) return;
    const kind = pendingKind;
    setPendingKind("");
    runAction(kind);
  };

  const dialog = pendingKind ? actionCopy[pendingKind] : null;

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
    <>
      <Dialog open={!!pendingKind} onOpenChange={(open) => !open && !busy && setPendingKind("")}>
        <DialogContent className="border-[#e3e3e3] bg-white sm:max-w-md" showCloseButton={!busy}>
          {dialog ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[17px] text-[#212529]">{dialog.title}</DialogTitle>
                <DialogDescription className="text-[14px] text-[#495057]">{dialog.body}</DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-2">
                <button type="button" className={cancelBtn} disabled={!!busy} onClick={() => setPendingKind("")}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={`${toolBtn} ${dialog.tone}`}
                  disabled={!!busy}
                  onClick={confirmPending}
                >
                  {busy ? `${dialog.label}…` : dialog.label}
                </button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

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
              onClick={() => setPendingKind("confirm")}
            >
              {busy === "confirm" ? "Confirming…" : "Make Confirmed"}
            </button>
            <button
              type="button"
              className={`${toolBtn} bg-[#6c757d] hover:bg-[#5a6268]`}
              disabled={!!busy}
              onClick={() => setPendingKind("reject")}
            >
              {busy === "reject" ? "Rejecting…" : "Make Rejected"}
            </button>
          </>
        ) : null
      }
    />
    </>
  );
}
