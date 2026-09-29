"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { FiPlus, FiSearch } from "react-icons/fi";

import { showToast } from "@/lib/showToast";
import { useOpeningStockTill } from "@/lib/posProducts";
import {
  ADMIN_INVENTORY_ADJUSTMENT_NEW,
  ADMIN_INVENTORY_ADJUSTMENT_TYPES,
  ADMIN_INVENTORY_ADJUSTMENT_VIEW,
} from "@/Route/Adminpannelroute";

import {
  ActionMenu,
  DateRange,
  EmptyRow,
  ListCard,
  Pagination,
  btn,
  inputClass,
  tdClass,
  thClass,
  theadRow,
  totalRow,
} from "@/components/ui/Application/Admin/listKit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const cancelBtn =
  "inline-flex items-center justify-center rounded-[6px] border border-[#dee2e6] bg-white px-4 py-2 text-[13px] font-semibold text-[#495057] shadow-sm transition hover:bg-[#f8f9fa] dark:border-input dark:bg-transparent dark:text-foreground";

const EMPTY_FILTERS = { type: "all", start: "", end: "", search: "" };

const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB") : "";

const money = (value) => Number(value || 0).toFixed(2);

const StatusChip = () => (
  <span className="inline-block whitespace-nowrap bg-[#10c469] px-[10px] py-[3px] text-[12px] font-semibold text-white">
    Confirmed
  </span>
);

export default function AdjustmentList() {
  const till = useOpeningStockTill();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1, from: 0, totalLoss: 0 });
  const [loading, setLoading] = useState(true);

  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const [selected, setSelected] = useState(() => new Set());
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const warehouseBlocked = !till.id || till.id === "warehouse";

  const params = useCallback(
    (extra) => ({
      showroomId: till.id,
      type: filters.type,
      ...(filters.search && { search: filters.search }),
      ...(filters.start && { from: filters.start }),
      ...(filters.end && { to: filters.end }),
      ...extra,
    }),
    [filters, till.id],
  );

  const load = useCallback(async () => {
    if (warehouseBlocked) {
      setRows([]);
      setMeta({ total: 0, pages: 1, from: 0, totalLoss: 0 });
      setLoading(false);
      setSelected(new Set());
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.get("/api/inventory/adjustments", {
        params: params({ page, limit }),
      });

      if (!data.success) {
        showToast("error", data.message || "Could not load adjustments");
        return;
      }

      setRows(data.data);
      setMeta({
        total: data.total,
        pages: data.pages,
        from: data.from,
        totalLoss: data.totalLoss || 0,
      });
      setSelected(new Set());
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not load adjustments",
      );
    } finally {
      setLoading(false);
    }
  }, [limit, page, params, warehouseBlocked]);

  useEffect(() => {
    load();
  }, [load]);

  const search = (event) => {
    event?.preventDefault();
    setPage(1);
    setFilters({ ...draft, search: draft.search.trim() });
  };

  const pageLoss = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.loss) || 0), 0),
    [rows],
  );

  const toggleAll = (checked) => {
    if (!checked) {
      setSelected(new Set());
      return;
    }

    setSelected(new Set(rows.map((row) => row.adjustmentId)));
  };

  const toggleRow = (adjustmentId, checked) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(adjustmentId);
      else next.delete(adjustmentId);
      return next;
    });
  };

  const allChecked = rows.length > 0 && rows.every((row) => selected.has(row.adjustmentId));

  const uniqueSelectedIds = [...selected];

  const runBulkDelete = async () => {
    if (uniqueSelectedIds.length === 0) return;

    setBusy(true);

    try {
      const { data } = await axios.delete("/api/inventory/adjustments", {
        data: { showroomId: till.id, ids: uniqueSelectedIds },
      });

      if (!data.success) {
        showToast("error", data.message || "Could not delete");
        return;
      }

      showToast("success", data.message);
      setPending(null);
      load();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not delete",
      );
    } finally {
      setBusy(false);
    }
  };

  const runSingleDelete = async (row) => {
    setDeletingId(row.adjustmentId);

    try {
      const { data } = await axios.delete(
        `/api/inventory/adjustments/${row.adjustmentId}`,
        { data: { showroomId: till.id } },
      );

      if (!data.success) {
        showToast("error", data.message || "Could not delete");
        return;
      }

      showToast("success", data.message);
      setPending(null);
      load();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not delete",
      );
    } finally {
      setDeletingId("");
    }
  };

  const runPending = () => {
    if (!pending) return;
    if (pending.kind === "bulk") runBulkDelete();
    else runSingleDelete(pending.row);
  };

  const dialogCopy = pending
    ? pending.kind === "bulk"
      ? {
          title: "Delete selected",
          body: `Delete ${uniqueSelectedIds.length} adjustment(s)? Stock at ${till.name} will be reversed.`,
          label: "Delete Selected",
          tone: btn.danger,
        }
      : {
          title: "Delete adjustment",
          body: `Delete ${pending.row.adjustmentNumber}? Stock at ${till.name} will be reversed.`,
          label: "Delete",
          tone: btn.danger,
        }
    : null;

  const dialogBusy =
    busy || (pending?.kind === "single" && deletingId === pending.row?.adjustmentId);

  const rowActions = (row) => {
    const billUrl = ADMIN_INVENTORY_ADJUSTMENT_VIEW(row.adjustmentId);

    return [
      ["View", () => window.open(billUrl, "_blank", "noopener,noreferrer")],
      [
        deletingId === row.adjustmentId ? "Deleting…" : "Delete",
        () => setPending({ kind: "single", row }),
        "danger",
      ],
    ];
  };

  const itemLabel = (row) => {
    const name = row.productName || "Item";
    if (row.variantLabel && row.variantLabel !== "Default") {
      return `${name} (${row.variantLabel})`;
    }
    return name;
  };

  const filtered =
    filters.search || filters.start || filters.end || filters.type !== "all";

  return (
    <div className="space-y-4">
      <Dialog open={!!pending} onOpenChange={(open) => !open && !dialogBusy && setPending(null)}>
        <DialogContent className="border-[#e3e3e3] bg-white sm:max-w-md" showCloseButton={!dialogBusy}>
          {dialogCopy ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[17px] text-[#212529]">{dialogCopy.title}</DialogTitle>
                <DialogDescription className="text-[14px] text-[#495057]">
                  {dialogCopy.body}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-2">
                <button type="button" className={cancelBtn} disabled={dialogBusy} onClick={() => setPending(null)}>
                  Cancel
                </button>
                <button type="button" className={dialogCopy.tone} disabled={dialogBusy} onClick={runPending}>
                  {dialogBusy ? `${dialogCopy.label}…` : dialogCopy.label}
                </button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ListCard
        title="Stock Adjustment List"
        actions={
          <>
            <Link href={ADMIN_INVENTORY_ADJUSTMENT_TYPES} className={btn.success}>
              <FiPlus size={14} /> Type List
            </Link>
            <Link href={ADMIN_INVENTORY_ADJUSTMENT_NEW} className={btn.primary}>
              <FiPlus size={14} /> New
            </Link>
          </>
        }
      >
        <form onSubmit={search} className="flex flex-wrap items-center gap-2">
          <select
            value={draft.type}
            onChange={(event) => setDraft({ ...draft, type: event.target.value })}
            className={`${inputClass} !w-36`}
            aria-label="Type"
          >
            <option value="all">Select Type</option>
            <option value="add">Addition</option>
            <option value="subtract">Deduction</option>
          </select>

          <DateRange
            className="w-full sm:w-[300px]"
            start={draft.start}
            end={draft.end}
            onStart={(value) => setDraft({ ...draft, start: value })}
            onEnd={(value) => setDraft({ ...draft, end: value })}
          />

          <input
            value={draft.search}
            onChange={(event) => setDraft({ ...draft, search: event.target.value })}
            placeholder="Search"
            className={`${inputClass} min-w-[160px] flex-1`}
            aria-label="Search"
          />

          <button type="submit" className={btn.info}>
            <FiSearch size={14} /> Search
          </button>

          <button
            type="button"
            className={btn.danger}
            disabled={uniqueSelectedIds.length === 0 || warehouseBlocked}
            onClick={() => setPending({ kind: "bulk" })}
          >
            Delete Selected
          </button>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className={theadRow}>
                <th className={`${thClass} w-10 text-center`}>
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allChecked}
                    disabled={rows.length === 0}
                    onChange={(event) => toggleAll(event.target.checked)}
                    className="size-4 rounded border-white/40"
                  />
                </th>
                {["Date", "Invoice No", "Type", "Item", "Quantity", "Loss", "Status", "Action"].map(
                  (head) => (
                    <th key={head} className={thClass}>
                      {head}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 9 }).map((__, cell) => (
                      <td key={cell} className={tdClass}>
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!loading && warehouseBlocked && (
                <EmptyRow
                  colSpan={9}
                  title="Switch to a shop branch"
                  hint="Use the branch switch at the top. Stock adjustment works on the current shop only."
                />
              )}

              {!loading && !warehouseBlocked && rows.length === 0 && (
                <EmptyRow
                  colSpan={9}
                  title={filtered ? "No adjustments match these filters" : "No adjustments yet"}
                />
              )}

              {!loading &&
                !warehouseBlocked &&
                rows.map((row) => (
                  <tr key={row.key}>
                    <td className={`${tdClass} text-center`}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.adjustmentNumber}`}
                        checked={selected.has(row.adjustmentId)}
                        onChange={(event) => toggleRow(row.adjustmentId, event.target.checked)}
                        className="size-4 rounded border-[#ced4da]"
                      />
                    </td>
                    <td className={tdClass}>{fmtDate(row.adjustmentDate)}</td>
                    <td className={tdClass}>
                      <a
                        href={ADMIN_INVENTORY_ADJUSTMENT_VIEW(row.adjustmentId)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[15px] font-semibold text-[#188ae2] hover:underline"
                      >
                        {row.adjustmentNumber}
                      </a>
                    </td>
                    <td className={tdClass}>{row.typeLabel}</td>
                    <td className={tdClass}>{itemLabel(row)}</td>
                    <td className={tdClass}>{row.quantity}</td>
                    <td className={tdClass}>{money(row.loss)}</td>
                    <td className={tdClass}>
                      <StatusChip />
                    </td>
                    <td className={tdClass}>
                      <ActionMenu items={rowActions(row)} />
                    </td>
                  </tr>
                ))}

              {!loading && !warehouseBlocked && rows.length > 0 && (
                <tr className={totalRow}>
                  <td className={tdClass} colSpan={5} />
                  <td className={`${tdClass} text-center`}>Total</td>
                  <td className={tdClass}>{money(pageLoss)}</td>
                  <td className={tdClass} colSpan={2} />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          pages={meta.pages}
          from={meta.from}
          count={rows.length}
          total={meta.total}
          onPage={setPage}
        />
      </ListCard>
    </div>
  );
}
