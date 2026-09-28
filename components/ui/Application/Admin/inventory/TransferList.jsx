"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FiSearch } from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { showToast } from "@/lib/showToast";
import { formatDateBD } from "@/lib/bdFormat";
import { selectClass } from "@/components/ui/Application/Admin/inventory/useInventory";
import { ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusLabel = {
  pending: "Pending",
  received: "Received",
};

/**
 * Transferred List and Received List are the same papers.
 * Received List is where a pending transfer is taken onto the shelf.
 */
export default function TransferList({ title, href, canReceive = false }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(canReceive ? "pending" : "all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [detail, setDetail] = useState(null);
  const [receivingId, setReceivingId] = useState("");

  const loadTransfers = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get("/api/inventory/transfers", {
        params: {
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
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not load transfers",
      );
    } finally {
      setLoading(false);
    }
  }, [status, page, search]);

  useEffect(() => {
    const timer = setTimeout(loadTransfers, 250);
    return () => clearTimeout(timer);
  }, [loadTransfers]);

  useEffect(() => {
    setPage(1);
  }, [status, search]);

  const receive = async (row) => {
    setReceivingId(row._id);

    try {
      const { data } = await axios.post(`/api/inventory/transfers/${row._id}/receive`);

      if (!data.success) {
        showToast("error", data.message || "Could not receive this transfer");
        return;
      }

      showToast("success", data.message);
      setDetail(null);
      loadTransfers();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not receive this transfer",
      );
    } finally {
      setReceivingId("");
    }
  };

  return (
    <div>
      <BreadCrumb
        breadcrumbData={[
          { href: ADMIN_DASHBOARD, label: "Home" },
          { href, label: title },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-col gap-3 border-b lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {canReceive
                ? "Stock waiting at the sale center until it is received"
                : "Stock sent out of the warehouse"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Number or product"
                className="w-60 pl-9"
              />
            </div>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={selectClass}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="received">Received</option>
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
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 7 }).map((__, cell) => (
                      <TableCell key={cell}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No transfers yet
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                rows.map((row) => (
                  <TableRow key={row._id}>
                    <TableCell className="font-medium">{row.transferNumber}</TableCell>
                    <TableCell>{formatDateBD(row.transferDate)}</TableCell>
                    <TableCell>{row.fromName}</TableCell>
                    <TableCell>{row.toName}</TableCell>
                    <TableCell className="text-right">{row.totalQuantity}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "received" ? "default" : "secondary"}>
                        {statusLabel[row.status] || row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDetail(row)}>
                          View
                        </Button>
                        {canReceive && row.status === "pending" && (
                          <Button
                            size="sm"
                            disabled={receivingId === row._id}
                            onClick={() => receive(row)}
                          >
                            {receivingId === row._id ? "Receiving…" : "Receive"}
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

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.transferNumber}</DialogTitle>
          </DialogHeader>

          {detail && (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">
                {detail.fromName} → {detail.toName} · {formatDateBD(detail.transferDate)} ·{" "}
                {statusLabel[detail.status]}
              </p>

              <div className="max-h-72 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items?.map((item) => (
                      <TableRow key={String(item.variantId)}>
                        <TableCell>
                          <span className="block font-medium">{item.productName}</span>
                          {item.variantLabel && (
                            <span className="block text-xs text-muted-foreground">
                              {item.variantLabel}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{item.sku || "—"}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {canReceive && detail.status === "pending" && (
                <div className="flex justify-end">
                  <Button disabled={receivingId === detail._id} onClick={() => receive(detail)}>
                    {receivingId === detail._id ? "Receiving…" : "Receive"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
