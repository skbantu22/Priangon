"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import axios from "axios";

import RepairReceipt from "@/components/RepairReceipt";

export default function RepairInvoicePage() {
  return (
    <Suspense fallback={<div className="mx-auto h-[420px] max-w-[860px] animate-pulse rounded-[8px] bg-white" />}>
      <RepairInvoice />
    </Suspense>
  );
}

function RepairInvoice() {
  const { id } = useParams();
  const params = useSearchParams();
  const [job, setJob] = useState(null);
  const [company, setCompany] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`/api/repair/${id}`)
      .then(({ data }) => (data.success ? setJob(data.job) : setError(data.message || "Job not found")))
      .catch((err) => setError(err.response?.data?.message || "Could not load the repair job"));
  }, [id]);

  useEffect(() => {
    axios
      .get("/api/settings")
      .then(({ data }) => {
        if (!data.success || !data.data) return;
        const s = data.data;
        setCompany({ name: s.companyName || "", logo: s.logo || "", address: s.address || "", phone: s.phone || "", email: s.email || "", invoiceFooter: s.invoiceFooter || "" });
      })
      .catch(() => {});
  }, []);

  if (error && !job) {
    return (
      <p className="rounded-[8px] bg-white p-6 text-center text-[#ff5b5b]" role="alert">
        {error}
      </p>
    );
  }

  if (!job) return <div className="mx-auto h-[420px] max-w-[860px] animate-pulse rounded-[8px] bg-white" />;

  return <RepairReceipt job={job} company={company} autoPrint={params.get("print") === "1"} />;
}
