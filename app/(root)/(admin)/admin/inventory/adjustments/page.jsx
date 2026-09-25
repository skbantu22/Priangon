"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import VariantPicker from "@/components/ui/Application/Admin/inventory/VariantPicker";
import { showToast } from "@/lib/showToast";
import { formatDateBD } from "@/lib/bdFormat";
import {
  ADMIN_DASHBOARD,
  ADMIN_INVENTORY_ADJUSTMENTS,
} from "@/Route/Adminpannelroute";

import {
  REASON_OPTIONS,
  reasonLabel,
  selectClass,
  useItemRows,
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

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_INVENTORY_ADJUSTMENTS, label: "Adjustments" },
];

const today = () => new Date().toISOString().slice(0, 10);

const AdjustmentsPage = () => {
  const { locations } = useLocations();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [reason, setReason] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null);

  const [formLocation, setFormLocation] = useState("warehouse");
  const [formReason, setFormReason] = useState("correction");
  const [formDate, setFormDate] = useState(today);
  const [formNote, setFormNote] = useState("");

  const { items, addItem, updateItem, removeItem, clearItems } = useItemRows();

  const loadAdjustments = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get("/api/inventory/adjustments", {
        params: {
          location,
          reason,
          page,
          limit: 25,
          ...(search.trim() && { search: search.trim() }),
        },
      });

      if (!data.success) {
        showToast("error", data.message || "Could not load adjustments");
        return;
      }

      setRows(data.data);
      setPages(data.pages);
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not load adjustments",
      );
    } finally {
      setLoading(false);
    }
  }, [location, reason, page, search]);

  useEffect(() => {
    const timer = setTimeout(loadAdjustments, 250);

    return () => clearTimeout(timer);
  }, [loadAdjustments]);

  useEffect(() => {
    setPage(1);
  }, [location, reason, search]);

  // The picker reads stock at the location being adjusted, so rows added
  // against the old one no longer mean what they say
  useEffect(() => {
    clearItems();
  }, [formLocation, clearItems]);

  const openForm = () => {
    clearItems();
    setFormLocation(locations[0]?.key || "warehouse");
    setFormReason("correction");
    setFormDate(today());
    setFormNote("");
    setOpen(true);
  };

  const saveAdjustment = async () => {
    if (items.length === 0) {
      showToast("error", "Add at least one product");
      return;
    }

    const invalid = items.find(
      (row) => !Number.isFinite(Number(row.quantity)) || Number(row.quantity) < 1,
    );

    if (invalid) {
      showToast("error", `Quantity for "${invalid.productName}" must be at least 1`);
      return;
    }

    setBusy(true);

    try {
      const { data } = await axios.post("/api/inventory/adjustments", {
        location: formLocation,
        reason: formReason,
        adjustmentDate: formDate,
        note: formNote,
        items: items.map((row) => ({
          variantId: row.variantId,
          quantity: Number(row.quantity),
          type: row.type,
        })),
      });

      if (!data.success) {
        showToast("error", data.message || "Could not save adjustment");
        return;
      }

      showToast("success", data.message);
      setOpen(false);
      clearItems();
      loadAdjustments();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not save adjustment",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card>
        <CardHeader className="flex flex-col gap-3 border-b lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Stock adjustments</h1>
            <p className="text-sm text-muted-foreground">
              Corrections no sale, purchase or transfer explains
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Number, product or note"
                className="w-60 pl-9"
              />
            </div>

            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className={selectClass}
            >
              <option value="all">All locations</option>

              {locations.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={selectClass}
            >
              <option value="all">Any reason</option>

              {REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <Button onClick={openForm}>
              <FiPlus /> New adjustment
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">In / Out</TableHead>
                <TableHead className="text-right">Details</TableHead>
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
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No adjustments yet
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                rows.map((row) => (
                  <TableRow key={row._id}>
                    <TableCell className="font-medium">
                      {row.adjustmentNumber}
                    </TableCell>

                    <TableCell>{formatDateBD(row.adjustmentDate)}</TableCell>

                    <TableCell>
                      <Badge variant="outline">{row.locationName}</Badge>
                    </TableCell>

                    <TableCell>{reasonLabel(row.reason)}</TableCell>

                    <TableCell>{row.items?.length || 0}</TableCell>

                    <TableCell className="text-right">
                      <span className="text-emerald-600">
                        +{row.totalAdded || 0}
                      </span>
                      {" / "}
                      <span className="text-red-500">
                        −{row.totalSubtracted || 0}
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetail(row)}
                      >
                        View
                      </Button>
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

      {/* ============ NEW ADJUSTMENT ============ */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New stock adjustment</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Location</Label>

              <select
                value={formLocation}
                onChange={(event) => setFormLocation(event.target.value)}
                className={selectClass}
              >
                {locations.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label>Reason</Label>

              <select
                value={formReason}
                onChange={(event) => setFormReason(event.target.value)}
                className={selectClass}
              >
                {REASON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label>Date</Label>

              <Input
                type="date"
                value={formDate}
                onChange={(event) => setFormDate(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Add products</Label>

            <VariantPicker location={formLocation} onAdd={addItem} />
          </div>

          <div className="max-h-64 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">In stock</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead className="w-28">Quantity</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      Nothing added yet
                    </TableCell>
                  </TableRow>
                )}

                {items.map((row) => (
                  <TableRow key={row.variantId}>
                    <TableCell>
                      <span className="block font-medium">{row.productName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {row.variantLabel}
                        {row.sku ? ` · ${row.sku}` : ""}
                      </span>
                    </TableCell>

                    <TableCell className="text-right">{row.stock}</TableCell>

                    <TableCell>
                      <select
                        value={row.type}
                        onChange={(event) =>
                          updateItem(row.variantId, { type: event.target.value })
                        }
                        className={selectClass}
                      >
                        <option value="subtract">Take out (−)</option>
                        <option value="add">Put in (+)</option>
                      </select>
                    </TableCell>

                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(event) =>
                          updateItem(row.variantId, {
                            quantity: event.target.value,
                          })
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(row.variantId)}
                      >
                        <FiTrash2 className="text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-2">
            <Label>Note</Label>

            <Textarea
              value={formNote}
              onChange={(event) => setFormNote(event.target.value)}
              placeholder="What happened, who counted it"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>

            <Button onClick={saveAdjustment} disabled={busy}>
              {busy ? "Saving…" : "Save adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ DETAILS ============ */}
      <Dialog open={!!detail} onOpenChange={(value) => !value && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.adjustmentNumber}</DialogTitle>
          </DialogHeader>

          {detail && (
            <>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Location: </span>
                  {detail.locationName}
                </p>
                <p>
                  <span className="text-muted-foreground">Date: </span>
                  {formatDateBD(detail.adjustmentDate)}
                </p>
                <p>
                  <span className="text-muted-foreground">Reason: </span>
                  {reasonLabel(detail.reason)}
                </p>
                <p>
                  <span className="text-muted-foreground">Saved by: </span>
                  {detail.createdBy || "—"}
                </p>
              </div>

              {detail.note && (
                <p className="rounded-md bg-muted p-3 text-sm">{detail.note}</p>
              )}

              <div className="max-h-72 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead className="text-right">Before</TableHead>
                      <TableHead className="text-right">After</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {detail.items?.map((row) => (
                      <TableRow key={`${row.variantId}-${row.quantity}`}>
                        <TableCell>
                          <span className="block font-medium">
                            {row.productName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {row.variantLabel}
                          </span>
                        </TableCell>

                        <TableCell
                          className={
                            row.type === "add"
                              ? "text-emerald-600"
                              : "text-red-500"
                          }
                        >
                          {row.type === "add" ? "+" : "−"}
                          {row.quantity}
                        </TableCell>

                        <TableCell className="text-right">
                          {row.previousStock}
                        </TableCell>

                        <TableCell className="text-right">
                          {row.newStock}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdjustmentsPage;
