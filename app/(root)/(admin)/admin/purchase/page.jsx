"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { FiCheckCircle, FiDollarSign, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { showToast } from "@/lib/showToast";
import { formatDateBD, formatTaka } from "@/lib/bdFormat";
import {
  ADMIN_DASHBOARD,
  ADMIN_PURCHASE_ADD,
  ADMIN_PURCHASE_SHOW,
} from "@/Route/Adminpannelroute";

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
  { href: ADMIN_PURCHASE_SHOW, label: "Purchase" },
];

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const statusVariant = {
  pending: "secondary",
  received: "default",
  cancelled: "destructive",
};

const paymentVariant = {
  unpaid: "destructive",
  partial: "secondary",
  paid: "default",
};

const PurchasePage = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");

  const [payTarget, setPayTarget] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payReference, setPayReference] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPurchases = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({ status, paymentStatus, limit: "50" });

      if (search.trim()) params.set("search", search.trim());

      const { data } = await axios.get(`/api/purchase?${params.toString()}`);

      if (data.success) {
        setPurchases(data.data);
      } else {
        showToast("error", data.message || "Could not load purchases");
      }
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not load purchases",
      );
    } finally {
      setLoading(false);
    }
  }, [search, status, paymentStatus]);

  useEffect(() => {
    const timer = setTimeout(loadPurchases, 250);

    return () => clearTimeout(timer);
  }, [loadPurchases]);

  const receivePurchase = async (purchase) => {
    if (
      !confirm(
        `Receive ${purchase.purchaseNumber}? Stock will increase and this cannot be undone once the units are sold.`,
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const { data } = await axios.post(
        `/api/purchase/receive/${purchase._id}`,
        {},
      );

      if (!data.success) {
        showToast("error", data.message || "Could not receive purchase");
        return;
      }

      showToast("success", "Stock updated");
      loadPurchases();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not receive purchase",
      );
    } finally {
      setBusy(false);
    }
  };

  const openPayDialog = (purchase) => {
    setPayTarget(purchase);
    setPayAmount(String(purchase.dueAmount));
    setPayMethod("cash");
    setPayReference("");
  };

  const savePayment = async () => {
    const amount = Number(payAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("error", "Enter a payment amount");
      return;
    }

    setBusy(true);

    try {
      const { data } = await axios.post(
        `/api/purchase/payment/${payTarget._id}`,
        { amount, method: payMethod, reference: payReference },
      );

      if (!data.success) {
        showToast("error", data.message || "Could not record payment");
        return;
      }

      showToast("success", "Payment recorded");
      setPayTarget(null);
      loadPurchases();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not record payment",
      );
    } finally {
      setBusy(false);
    }
  };

  const cancelPurchase = async (purchase) => {
    if (
      !confirm(
        `Cancel ${purchase.purchaseNumber}? Received stock will be pulled back out.`,
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const { data } = await axios.delete(
        `/api/purchase/delete/${purchase._id}`,
      );

      if (!data.success) {
        showToast("error", data.message || "Could not cancel purchase");
        return;
      }

      showToast("success", "Purchase cancelled");
      loadPurchases();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not cancel purchase",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h4 className="text-xl font-semibold">Purchase</h4>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Purchase no, challan or supplier"
                className="pl-9 w-full sm:w-64"
              />
            </div>

            <select
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              className={selectClass}
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <option value="all">All payments</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>

            <Button asChild>
              <Link href={ADMIN_PURCHASE_ADD}>
                <FiPlus className="mr-2" />
                New Purchase
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-3 pb-4">
          {loading ? (
            <div className="space-y-2 py-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : purchases.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No purchase found. Create one when goods come in from a supplier.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Purchase</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {purchases.map((purchase) => (
                    <TableRow key={purchase._id}>
                      <TableCell>
                        <div className="font-medium">
                          {purchase.purchaseNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateBD(purchase.purchaseDate)}
                          {purchase.referenceNo
                            ? ` · ${purchase.referenceNo}`
                            : ""}
                          {` · ${purchase.items.length} item`}
                        </div>
                      </TableCell>

                      <TableCell>{purchase.supplierName}</TableCell>

                      <TableCell className="text-right tabular-nums">
                        {formatTaka(purchase.grandTotal)}
                      </TableCell>

                      <TableCell
                        className={`text-right tabular-nums ${
                          purchase.dueAmount > 0
                            ? "font-semibold text-destructive"
                            : ""
                        }`}
                      >
                        {formatTaka(purchase.dueAmount)}
                      </TableCell>

                      <TableCell>
                        <Badge variant={statusVariant[purchase.status]}>
                          {purchase.status}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge variant={paymentVariant[purchase.paymentStatus]}>
                          {purchase.paymentStatus}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {purchase.status === "pending" && (
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() => receivePurchase(purchase)}
                              title="Receive into stock"
                            >
                              <FiCheckCircle />
                            </Button>
                          )}

                          {purchase.status !== "cancelled" &&
                            purchase.dueAmount > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => openPayDialog(purchase)}
                                title="Record a payment"
                              >
                                <FiDollarSign />
                              </Button>
                            )}

                          {purchase.status !== "cancelled" &&
                            purchase.paidAmount === 0 && (
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={busy}
                                onClick={() => cancelPurchase(purchase)}
                                title="Cancel purchase"
                              >
                                <FiTrash2 />
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!payTarget} onOpenChange={() => setPayTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Pay {payTarget?.purchaseNumber} — {payTarget?.supplierName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Due on this purchase:{" "}
              <span className="font-semibold text-foreground">
                {formatTaka(payTarget?.dueAmount)}
              </span>
            </p>

            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount</Label>
              <Input
                id="pay-amount"
                type="number"
                min={0}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay-method">Method</Label>
              <select
                id="pay-method"
                className={`${selectClass} w-full`}
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="bank">Bank</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay-ref">Reference</Label>
              <Input
                id="pay-ref"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="Trx ID / cheque no"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)}>
              Cancel
            </Button>

            <Button onClick={savePayment} disabled={busy}>
              {busy ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchasePage;
