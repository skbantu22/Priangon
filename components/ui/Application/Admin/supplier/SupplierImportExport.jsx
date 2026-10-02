"use client";

import { useRef, useState } from "react";
import axios from "axios";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { btn, exportExcel } from "@/components/ui/Application/Admin/supplier/supplierKit";

/** The columns the upload understands, in the order the sample writes them */
const SAMPLE_HEAD = [
  "Name",
  "Business Name",
  "Mobile",
  "Email",
  "Address",
  "Area",
  "Branch",
  "Opening Balance",
  "Initial Advance",
  "SR Name",
  "SR Mobile",
  "DSR Name",
  "DSR Mobile",
  "Note",
];

const SAMPLE_ROW = [
  "Mr. Rahman",
  "Rahman Traders",
  "01711111111",
  "rahman@example.com",
  "Mirpur, Dhaka",
  "Mirpur",
  "Ware House",
  0,
  0,
  "Karim",
  "01811111111",
  "Jalal",
  "01911111111",
  "",
];

/**
 * Import/Export, the way the supplier list offers it.
 *
 * Export writes the whole list the current filters would show; import
 * reads a sheet in the browser and sends plain rows, so the server never
 * has to hold a file. A row that already exists is updated rather than
 * duplicated.
 */
export default function SupplierImportExport({ onClose, onImported, exportRows }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const downloadSample = () =>
    exportExcel("Supplier-import-sample.xlsx", SAMPLE_HEAD, [SAMPLE_ROW]);

  const runExport = async () => {
    setBusy(true);

    try {
      await exportRows();
    } finally {
      setBusy(false);
    }
  };

  const upload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setBusy(true);
    setResult(null);

    try {
      const XLSX = await import("xlsx");

      const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = book.Sheets[book.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (rows.length === 0) {
        showToast("error", "That file has no rows");
        return;
      }

      const { data } = await axios.post("/api/supplier/import", { rows });

      if (!data.success) {
        showToast("error", data.message || "Could not import");
        return;
      }

      setResult(data);
      showToast("success", data.message);
      onImported?.();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || error.message || "Could not read that file",
      );
    } finally {
      setBusy(false);

      // Let the same file be picked again after a fix
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[560px] overflow-hidden rounded-[6px] bg-white shadow-[0_10px_40px_rgba(0,0,0,0.25)] dark:bg-card"
      >
        <div className="flex items-center justify-between border-b border-[#dee2e6] bg-[#f7f7f7] px-5 py-[16px] dark:border-border dark:bg-muted">
          <h3 className="text-[17px] font-medium">Import / Export Suppliers</h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#6c757d] hover:bg-black/5"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="space-y-2">
            <p className="text-sm font-medium">Export</p>
            <p className="text-sm text-muted-foreground">
              Writes every supplier the current filters show, with their balances.
            </p>

            <button type="button" onClick={runExport} disabled={busy} className={btn.success}>
              <Download size={14} /> Export to Excel
            </button>
          </div>

          <hr className="border-[#eef1f4] dark:border-border" />

          <div className="space-y-2">
            <p className="text-sm font-medium">Import</p>
            <p className="text-sm text-muted-foreground">
              Name and mobile are required. A supplier with the same name and mobile is
              updated instead of added twice. Branch may be a branch name or left blank
              for the warehouse.
            </p>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={downloadSample} className={btn.secondary}>
                <FileSpreadsheet size={14} /> Sample file
              </button>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className={btn.info}
              >
                <Upload size={14} /> {busy ? "Working…" : "Choose file"}
              </button>

              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={upload}
                className="hidden"
              />
            </div>
          </div>

          {result && (
            <div className="rounded border border-[#e6ebf1] bg-[#f8fafc] p-3 text-sm dark:border-border dark:bg-muted">
              <p className="font-medium">
                {result.created} added · {result.updated} updated · {result.skipped} skipped
              </p>

              {result.errors?.length > 0 && (
                <ul className="mt-2 max-h-40 list-disc overflow-auto pl-5 text-[13px] text-red-600">
                  {result.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-[#eef1f4] px-5 py-3 dark:border-border">
          <button type="button" className={btn.secondary} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
