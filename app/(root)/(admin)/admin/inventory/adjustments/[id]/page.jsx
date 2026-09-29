"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import axios from "axios";

import AdjustmentReceipt from "@/components/AdjustmentReceipt";
import { useOpeningStockTill } from "@/lib/posProducts";

export default function AdjustmentBillPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-[420px] max-w-[860px] animate-pulse rounded-[8px] bg-white" />}>
      <AdjustmentBill />
    </Suspense>
  );
}

function AdjustmentBill() {
  const { id } = useParams();
  const params = useSearchParams();
  const till = useOpeningStockTill();
  const [adjustment, setAdjustment] = useState(null);
  const [company, setCompany] = useState({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!till.id || till.id === "warehouse") {
      setError("Switch to a shop to view this adjustment");
      return;
    }

    try {
      const { data } = await axios.get(`/api/inventory/adjustments/${id}`, {
        params: { showroomId: till.id },
      });

      if (!data.success) {
        setError(data.message || "Adjustment not found");
        return;
      }

      setAdjustment(data.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load adjustment");
    }
  }, [id, till.id]);

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

  if (error && !adjustment) {
    return (
      <p className="rounded-[8px] bg-white p-6 text-center text-[#ff5b5b]" role="alert">
        {error}
      </p>
    );
  }

  if (!adjustment) {
    return <div className="mx-auto h-[420px] max-w-[860px] animate-pulse rounded-[8px] bg-white" />;
  }

  return (
    <AdjustmentReceipt
      adjustment={adjustment}
      company={company}
      autoPrint={params.get("print") === "1"}
    />
  );
}
