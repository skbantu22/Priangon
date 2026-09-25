"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FiCheckCircle, FiSearch, FiXCircle } from "react-icons/fi";

import { showToast } from "@/lib/showToast";
import { formatDateBD, formatDateTimeBD } from "@/lib/bdFormat";

import {
  selectClass,
  statusVariant,
  useLocations,
} from "@/components/ui/Application/Admin/inventory/useInventory";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * The transferred and received lists.
 *
 * Both read the same transfers from opposite ends, so they share a
 * screen: "sent" watches what has gone out and can still call it back,
 * "received" counts in what has arrived.
 */
export default function TransferList({ direction, title, description }) {
  const { locations } = useLocations();

  const incoming = direction === "received";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [status, setStatus] = useState(incoming ? "pending" : "all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [detail, setDetail] = useState(null);
  const [counted, setCounted] = useState({});
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  const loadTransfers = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get("/api/inventory/transfers", {
        params: {
          direction,
          location,
          status,
          page,
          limit: 25,
          ...(search.trim() && { search: search.trim() }),
        },
      });

      if (!data.success) {
        showToast("error", data.message || "Could not load transfers");
        return;
      }

      setRows(data.data);
      setPages(data.pages);
      setPendingCount(data.pending);
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not load transfers",
      );
    } finally {
      setLoading(false);
    }
  }, [direction, location, status, page, search]);

  useEffect(() => {
    const timer = setTimeout(loadTransfers, 250);

    return () => clearTimeout(timer);
  }, [loadTransfers]);

  useEffect(() => {
    setPage(1);
  }, [location, status, search]);

  const openReceive = (transfer) => {
    setDetail(transfer);

    // Everything is counted in as sent unless someone says otherwise
    setCounted(
      Object.fromEntries(
        (transfer.items || []).map((item) => [
          String(item.variantId),
          item.quantity,
        ]),
      ),
    );
  };

  const receiveTransfer = async () => {
    if (!detail) return;

    setBusy(true);

    try {
      const { data } = await axios.post(
        `/api/inventory/transfers/${detail._id}/receive`,
        {
          items: (detail.items || []).map((item) => ({
            variantId: item.variantId,
            receivedQuantity: Number(counted[String(item.variantId)] ?? item.quantity),
          })),
        },
      );

      if (!data.success) {
        showToast("error", data.message || "Could not receive the transfer");
        return;
      }

      showToast("success", data.message);
      setDetail(null);
      loadTransfers();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not receive the transfer",
      );
    } finally {
      setBusy(false);
    }
  };

  const rejectTransfer = async () => {
    if (!rejecting) return;

    setBusy(true);

    try {
      const { data } = await axios.post(
        `/api/inventory/transfers/${rejecting._id}/reject`,
        { reason: rejectReason },
      );

      if (!data.success) {
        showToast("error", data.message || "Could not send it back");
        return;
      }

      showToast("success", data.message);
      setRejecting(null);
      setRejectReason("");
      loadTransfers();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not send it back",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Card>
        <CardHeader className="flex flex-col gap-3 border-b lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-semibold">
              {title}

              {incoming && pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingCount} waiting
                </Badge>
              )}
            </h1>

            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Number, product or branch"
                className="w-60 pl-9"
              />
            </div>

            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className={selectClass}
            >
              <option value="all">
                {incoming ? "All destinations" : "All senders"}
              </option>

              {locations.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={selectClass}
            >
              <option value="all">Any status</option>
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="rejected">Sent back</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 8 }).map((__, cell) => (
                      <TableCell key={cell}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Nothing here yet
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                rows.map((row) => (
                  <TableRow key={row._id}>
                    <TableCell className="font-medium">
                      {row.transferNumber || "—"}
                    </TableCell>

                    <TableCell>{formatDateBD(row.transferDate)}</TableCell>

                    <TableCell>{row.fromName || "—"}</TableCell>

                    <TableCell>{row.toName || "—"}</TableCell>

                    <TableCell className="text-right">
                      {row.items?.length || 0}
                    </TableCell>

                    <TableCell className="text-right">
                      {row.totalQuantity || row.quantity || 0}
                    </TableCell>

                    <TableCell>
                      <Badge variant={statusVariant[row.status] || "secondary"}>
                        {row.status === "rejected" ? "sent back" : row.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openReceive(row)}
                        >
                          View
                        </Button>

                        {row.status === "pending" && incoming && (
                          <Button size="sm" onClick={() => openReceive(row)}>
                            <FiCheckCircle /> Receive
                          </Button>
                        )}

                        {row.status === "pending" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setRejecting(row);
                              setRejectReason("");
                            }}
                          >
                            <FiXCircle /> {incoming ? "Reject" : "Call back"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* ============ DETAILS / RECEIVE ============ */}
      <Dialog open={!!detail} onOpenChange={(value) => !value && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detail?.transferNumber} · {detail?.fromName} → {detail?.toName}
            </DialogTitle>
          </DialogHeader>

          {detail && (
            <>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Sent: </span>
                  {formatDateBD(detail.transferDate)}
                </p>
                <p>
                  <span className="text-muted-foreground">Status: </span>
                  {detail.status === "rejected" ? "sent back" : detail.status}
                </p>
                {detail.receivedAt && (
                  <p>
                    <span className="text-muted-foreground">Received: </span>
                    {formatDateTimeBD(detail.receivedAt)}
                  </p>
                )}
                {detail.rejectReason && (
                  <p>
                    <span className="text-muted-foreground">Reason: </span>
                    {detail.rejectReason}
                  </p>
                )}
              </div>

              {detail.note && (
                <p className="rounded-md bg-muted p-3 text-sm">{detail.note}</p>
              )}

              <div className="max-h-72 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Sent</TableHead>
                      <TableHead className="w-32 text-right">
                        {detail.status === "pending" && incoming
                          ? "Counted in"
                          : "Received"}
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {detail.items?.map((item) => (
                      <TableRow key={String(item.variantId)}>
                        <TableCell>
                          <span className="block font-medium">
                            {item.productName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {item.variantLabel}
                            {item.sku ? ` · ${item.sku}` : ""}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>

                        <TableCell className="text-right">
                          {detail.status === "pending" && incoming ? (
                            <Input
                              type="number"
                              min={0}
                              max={item.quantity}
                              value={counted[String(item.variantId)] ?? item.quantity}
                              onChange={(event) =>
                                setCounted((current) => ({
                                  ...current,
                                  [String(item.variantId)]: event.target.value,
                                }))
                              }
                              className="text-right"
                            />
                          ) : (
                            item.receivedQuantity || 0
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {detail.status === "pending" && incoming && (
                <p className="text-xs text-muted-foreground">
                  Anything counted short goes back to {detail.fromName} rather
                  than disappearing.
                </p>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDetail(null)}
                  disabled={busy}
                >
                  Close
                </Button>

                {detail.status === "pending" && incoming && (
                  <Button onClick={receiveTransfer} disabled={busy}>
                    {busy ? "Receiving…" : "Receive into stock"}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ REJECT / CALL BACK ============ */}
      <Dialog
        open={!!rejecting}
        onOpenChange={(value) => !value && setRejecting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {incoming ? "Reject" : "Call back"} {rejecting?.transferNumber}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            All {rejecting?.totalQuantity} unit
            {rejecting?.totalQuantity === 1 ? "" : "s"} go back to{" "}
            {rejecting?.fromName}.
          </p>

          <div className="grid gap-2">
            <Label>Reason</Label>

            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Never arrived, damaged, sent by mistake"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejecting(null)}
              disabled={busy}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={rejectTransfer}
              disabled={busy}
            >
              {busy ? "Working…" : "Send it back"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
