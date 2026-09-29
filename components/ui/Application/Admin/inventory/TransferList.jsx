"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { FiSearch } from "react-icons/fi";

import { showToast } from "@/lib/showToast";
import { useOpeningStockTill, posShowroomsQueryOptions } from "@/lib/posProducts";
import {
  ADMIN_INVENTORY_TRANSFER,
  ADMIN_INVENTORY_TRANSFER_VIEW,
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
const EMPTY_FILTERS = {
  branchId: "",
  status: "all",
  productId: "",
  start: "",
  end: "",
  search: "",
};

const STATUS_LABEL = { pending: "Pending", received: "Confirmed", rejected: "Rejected" };
const STATUS_STYLE = {
  pending: "bg-[#f9c851] text-[#212529]",
  received: "bg-[#10c469] text-white",
  rejected: "bg-[#6c757d] text-white",
};

const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB") : "";

const lineQty = (row) =>
  Number(row.totalQuantity) ||
  (row.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

const StatusChip = ({ status }) => (
  <span
    className={`inline-block whitespace-nowrap px-[10px] py-[3px] text-[12px] font-semibold ${STATUS_STYLE[status] || "bg-[#e9ecef] text-[#495057]"}`}
  >
    {STATUS_LABEL[status] || status}
  </span>
);

/**
 * AmarSolution-style transferred / received lists.
 * `view`: "transferred" (outgoing) or "received" (incoming).
 */
export default function TransferList({ title, view = "transferred", canConfirm = false }) {
  const till = useOpeningStockTill();
  const { data: showrooms = [] } = useQuery(posShowroomsQueryOptions());
  const { data: products = [] } = useQuery({
    queryKey: ["transfer-list-products"],
    queryFn: async () => {
      const { data } = await axios.get("/api/product/list", {
        params: { limit: 100, location: "all" },
      });
      return data.success ? data.items : [];
    },
    staleTime: 60_000,
  });

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1, from: 0, totalQuantity: 0 });
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState("");
  const [rejectingId, setRejectingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [pending, setPending] = useState(null);

  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [limit] = useState("25");

  const partyHeader = view === "received" ? "Sender" : "Received";
  const branchOptions = showrooms.filter((s) => String(s._id) !== String(till.id));

  const params = useCallback(
    (extra) => ({
      view,
      showroomId: till.id,
      status: filters.status,
      ...(filters.branchId && { branchId: filters.branchId }),
      ...(filters.productId && { productId: filters.productId }),
      ...(filters.search && { search: filters.search }),
      ...(filters.start && { from: filters.start }),
      ...(filters.end && { to: filters.end }),
      ...extra,
    }),
    [filters, till.id, view],
  );

  const load = useCallback(async () => {
    if (!till.id || till.id === "warehouse") {
      setRows([]);
      setMeta({ total: 0, pages: 1, from: 0, totalQuantity: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.get("/api/inventory/transfers", {
        params: params({ page, limit }),
      });

      if (!data.success) {
        showToast("error", data.message || "Could not load transfers");
        return;
      }

      setRows(data.data);
      setMeta({
        total: data.total,
        pages: data.pages,
        from: data.from,
        totalQuantity: data.totalQuantity || 0,
      });
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not load transfers",
      );
    } finally {
      setLoading(false);
    }
  }, [limit, page, params, till.id]);

  useEffect(() => {
    load();
  }, [load]);

  const search = (event) => {
    event?.preventDefault();
    setPage(1);
    setFilters({ ...draft, search: draft.search.trim() });
  };

  const clear = () => {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const deleteMessage = (row) => {
    if (view === "received" && row.status === "pending") {
      return `Delete ${row.transferNumber}? Stock will return to ${row.fromName || "the sender"}.`;
    }
    if (view === "received" && row.status === "rejected") {
      return `Delete ${row.transferNumber}? This rejected transfer will be removed.`;
    }
    return `Delete ${row.transferNumber}? Stock will go back to your shop.`;
  };

  const pendingCopy = (item) => {
    if (!item) return null;
    const { kind, row } = item;
    if (kind === "confirm") {
      return {
        title: "Confirm transfer",
        body: `Confirm ${row.transferNumber}? Stock will enter your shop.`,
        label: "Confirm",
        tone: btn.success,
      };
    }
    if (kind === "reject") {
      return {
        title: "Reject transfer",
        body: `Reject ${row.transferNumber}? Stock will go back to ${row.fromName || "the sender"}.`,
        label: "Reject",
        tone: btn.danger,
      };
    }
    return {
      title: "Delete transfer",
      body: deleteMessage(row),
      label: "Delete",
      tone: btn.danger,
    };
  };

  const runPending = async () => {
    if (!pending) return;
    const { kind, row } = pending;
    setPending(null);
    if (kind === "confirm") await executeConfirm(row);
    else if (kind === "reject") await executeReject(row);
    else await executeDelete(row);
  };

  const executeConfirm = async (row) => {
    setConfirmingId(row._id);

    try {
      const { data } = await axios.post(`/api/inventory/transfers/${row._id}/receive`, {
        showroomId: till.id,
      });

      if (!data.success) {
        showToast("error", data.message || "Could not confirm");
        return;
      }

      showToast("success", data.message);
      load();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not confirm",
      );
    } finally {
      setConfirmingId("");
    }
  };

  const confirmTransfer = (row) => setPending({ kind: "confirm", row });

  const executeReject = async (row) => {
    setRejectingId(row._id);

    try {
      const { data } = await axios.post(`/api/inventory/transfers/${row._id}/reject`, {
        showroomId: till.id,
      });

      if (!data.success) {
        showToast("error", data.message || "Could not reject");
        return;
      }

      showToast("success", data.message);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not reject");
    } finally {
      setRejectingId("");
    }
  };

  const rejectTransfer = (row) => setPending({ kind: "reject", row });

  const partyName = (row) => (view === "received" ? row.fromName : row.toName);

  const executeDelete = async (row) => {
    setDeletingId(row._id);

    try {
      const { data } = await axios.delete(`/api/inventory/transfers/${row._id}`, {
        data: { showroomId: till.id },
      });

      if (!data.success) {
        showToast("error", data.message || "Could not delete");
        return;
      }

      showToast("success", data.message || "Transfer deleted");
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

  const deleteTransfer = (row) => setPending({ kind: "delete", row });

  const dialogCopy = pendingCopy(pending);
  const dialogBusy =
    pending &&
    ((pending.kind === "confirm" && confirmingId === pending.row._id) ||
      (pending.kind === "reject" && rejectingId === pending.row._id) ||
      (pending.kind === "delete" && deletingId === pending.row._id));

  const rowActions = (row) => {
    const billUrl = ADMIN_INVENTORY_TRANSFER_VIEW(row._id);
    const items = [
      ["View", () => window.open(billUrl, "_blank", "noopener,noreferrer")],
      [
        "Invoice",
        () => window.open(`${billUrl}?print=1`, "_blank", "noopener,noreferrer"),
      ],
    ];

    if (view === "transferred") {
      if (row.status === "pending") {
        items.push([
          deletingId === row._id ? "Deleting…" : "Delete",
          () => deleteTransfer(row),
          "danger",
        ]);
      }
    } else if (canConfirm) {
      if (row.status === "pending") {
        items.push([
          confirmingId === row._id ? "Confirming…" : "Make Confirmed",
          () => confirmTransfer(row),
        ]);
        items.push([
          rejectingId === row._id ? "Rejecting…" : "Make Rejected",
          () => rejectTransfer(row),
        ]);
      }

      if (row.status === "pending" || row.status === "rejected") {
        items.push([
          deletingId === row._id ? "Deleting…" : "Delete",
          () => deleteTransfer(row),
          "danger",
        ]);
      }
    }

    return items;
  };

  const filtered =
    filters.search ||
    filters.start ||
    filters.end ||
    filters.branchId ||
    filters.productId ||
    filters.status !== "all";

  const warehouseBlocked = !till.id || till.id === "warehouse";
  const pageTotalQty = rows.reduce((sum, row) => sum + lineQty(row), 0);

  return (
    <div className="space-y-4">
      <Dialog open={!!pending} onOpenChange={(open) => !open && !dialogBusy && setPending(null)}>
        <DialogContent className="border-[#e3e3e3] bg-white sm:max-w-md" showCloseButton={!dialogBusy}>
          {dialogCopy ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[17px] text-[#212529]">{dialogCopy.title}</DialogTitle>
                <DialogDescription className="text-[14px] text-[#495057]">{dialogCopy.body}</DialogDescription>
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
        title={title}
        actions={
          <Link href={ADMIN_INVENTORY_TRANSFER} className={btn.primary}>
            Make Transfer
          </Link>
        }
      >
        <form onSubmit={search} className="flex flex-wrap items-center gap-2">
          {view === "transferred" ? (
            <select
              value={draft.branchId}
              onChange={(event) => setDraft({ ...draft, branchId: event.target.value })}
              className={`${inputClass} !w-40`}
              aria-label="Branch"
            >
              <option value="">Select Branch</option>
              {branchOptions.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
          ) : null}

          <select
            value={draft.status}
            onChange={(event) => setDraft({ ...draft, status: event.target.value })}
            className={`${inputClass} !w-36`}
            aria-label="Status"
          >
            <option value="all">Select Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            {view === "received" ? <option value="rejected">Rejected</option> : null}
          </select>

          <select
            value={draft.productId}
            onChange={(event) => setDraft({ ...draft, productId: event.target.value })}
            className={`${inputClass} !w-40`}
            aria-label="Product"
          >
            <option value="">Select Product</option>
            {products.map((product) => (
              <option key={product._id} value={product._id}>
                {product.name}
              </option>
            ))}
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
          />

          <button type="submit" className={btn.info}>
            <FiSearch size={14} /> Search
          </button>
          <button type="button" onClick={clear} className={btn.danger}>
            Clear
          </button>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className={theadRow}>
                {["SL", "Date", "Invoice No.", partyHeader, "Total Quantity", "Status", "Action"].map(
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
                    {Array.from({ length: 7 }).map((__, cell) => (
                      <td key={cell} className={tdClass}>
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!loading && warehouseBlocked && (
                <EmptyRow
                  colSpan={7}
                  title="Switch to a shop branch"
                  hint="Use the branch switch at the top to see transfers for that shop."
                />
              )}

              {!loading && !warehouseBlocked && rows.length === 0 && (
                <EmptyRow
                  colSpan={7}
                  title={filtered ? "No transfers match these filters" : "No transfers yet"}
                />
              )}

              {!loading &&
                !warehouseBlocked &&
                rows.map((row, index) => (
                  <tr key={row._id}>
                    <td className={tdClass}>{meta.from + index}</td>
                    <td className={tdClass}>{fmtDate(row.transferDate)}</td>
                    <td className={tdClass}>
                      <a
                        href={ADMIN_INVENTORY_TRANSFER_VIEW(row._id)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[15px] font-semibold text-[#188ae2] hover:underline"
                      >
                        {row.transferNumber}
                      </a>
                    </td>
                    <td className={tdClass}>{partyName(row)}</td>
                    <td className={tdClass}>{lineQty(row)}</td>
                    <td className={tdClass}>
                      <StatusChip status={row.status} />
                    </td>
                    <td className={tdClass}>
                      <ActionMenu items={rowActions(row)} />
                    </td>
                  </tr>
                ))}

              {!loading && !warehouseBlocked && rows.length > 0 && (
                <tr className={totalRow}>
                  <td className={tdClass} colSpan={2} />
                  <td className={`${tdClass} text-center`} colSpan={2}>
                    Total
                  </td>
                  <td className={tdClass}>{pageTotalQty}</td>
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
