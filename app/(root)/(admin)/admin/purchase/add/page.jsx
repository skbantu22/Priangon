"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { showToast } from "@/lib/showToast";
import {
  ADMIN_DASHBOARD,
  ADMIN_PURCHASE_ADD,
  ADMIN_PURCHASE_SHOW,
} from "@/Route/Adminpannelroute";

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
  { href: ADMIN_PURCHASE_SHOW, label: "Purchase" },
  { href: ADMIN_PURCHASE_ADD, label: "New Purchase" },
];

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

// toISOString() reads the UTC date, which in Bangladesh (UTC+6) is still
// yesterday until 6am — a date picker that defaults to yesterday hides the
// rows just entered. These read the date as the browser sees it.
const isoDay = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const today = () => isoDay(new Date());

const AddPurchasePage = () => {
  const router = useRouter();

  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today);

  const [items, setItems] = useState([]);

  const [discount, setDiscount] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [note, setNote] = useState("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [imeiRow, setImeiRow] = useState(null);
  const [imeiText, setImeiText] = useState("");

  const [saving, setSaving] = useState(false);

  const searchTimer = useRef(null);

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const { data } = await axios.get("/api/supplier?active=true");

        if (data.success) setSuppliers(data.data);
      } catch {
        showToast("error", "Could not load suppliers");
      }
    };

    loadSuppliers();
  }, []);

  // Debounced so a scanner firing character by character hits the API once
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);

      try {
        const { data } = await axios.get(
          `/api/purchase/variant-search?q=${encodeURIComponent(query.trim())}`,
        );

        if (data.success) setResults(data.data);
      } catch {
        showToast("error", "Product search failed");
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer.current);
  }, [query]);

  const addItem = useCallback((result) => {
    setItems((current) => {
      const existingIndex = current.findIndex(
        (item) => item.variantId === result.variantId,
      );

      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: Number(next[existingIndex].quantity) + 1,
        };
        return next;
      }

      return [
        ...current,
        {
          variantId: result.variantId,
          productId: result.productId,
          productName: result.productName,
          variantLabel: result.variantLabel,
          sku: result.sku,
          currentStock: result.stock,
          quantity: 1,
          unitPrice: 0,
          imeis: [],
        },
      ];
    });

    setQuery("");
    setResults([]);
  }, []);

  const updateItem = (index, patch) => {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (index) => {
    setItems((current) => current.filter((_, i) => i !== index));
  };

  const openImeiDialog = (index) => {
    setImeiRow(index);
    setImeiText(items[index].imeis.join("\n"));
  };

  const saveImeis = () => {
    const imeis = imeiText
      .split(/[\n,]/)
      .map((imei) => imei.trim())
      .filter(Boolean);

    const row = items[imeiRow];

    if (imeis.length > Number(row.quantity)) {
      showToast(
        "error",
        `${imeis.length} IMEI for only ${row.quantity} unit. Raise the quantity first.`,
      );
      return;
    }

    updateItem(imeiRow, { imeis });
    setImeiRow(null);
  };

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        0,
      ),
    [items],
  );

  const grandTotal =
    subtotal - (Number(discount) || 0) + (Number(shippingCost) || 0);

  const due = grandTotal - (Number(paidAmount) || 0);

  const savePurchase = async (status) => {
    if (!supplierId) {
      showToast("error", "Select a supplier");
      return;
    }

    if (items.length === 0) {
      showToast("error", "Add at least one item");
      return;
    }

    const zeroPriced = items.find((item) => Number(item.unitPrice) <= 0);

    if (zeroPriced) {
      showToast(
        "error",
        `Enter a purchase price for "${zeroPriced.productName}"`,
      );
      return;
    }

    if (due < 0) {
      showToast("error", "Paid amount is more than the total");
      return;
    }

    setSaving(true);

    try {
      const { data } = await axios.post("/api/purchase/create", {
        supplierId,
        referenceNo,
        purchaseDate,
        items: items.map((item) => ({
          variantId: item.variantId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          imeis: item.imeis,
        })),
        discount: Number(discount) || 0,
        shippingCost: Number(shippingCost) || 0,
        paidAmount: Number(paidAmount) || 0,
        paymentMethod,
        paymentReference,
        note,
        status,
      });

      if (!data.success) {
        showToast("error", data.message || "Could not save purchase");
        return;
      }

      showToast(
        "success",
        status === "received"
          ? `${data.data.purchaseNumber} saved and stock updated`
          : `${data.data.purchaseNumber} saved as pending`,
      );

      router.push(ADMIN_PURCHASE_SHOW);
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not save purchase",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b">
          <h4 className="text-xl font-semibold">New Purchase</h4>
        </CardHeader>

        <CardContent className="px-3 py-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="purchase-supplier">Supplier</Label>
            <select
              id="purchase-supplier"
              className={selectClass}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">Select a supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.name}
                  {supplier.companyName ? ` — ${supplier.companyName}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchase-ref">Supplier Challan / Invoice No</Label>
            <Input
              id="purchase-ref"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchase-date">Purchase Date</Label>
            <Input
              id="purchase-date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b">
          <h4 className="text-lg font-semibold">Items</h4>
        </CardHeader>

        <CardContent className="px-3 py-4 space-y-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Scan barcode or type a product name"
              className="pl-9"
            />

            {(results.length > 0 || searching) && (
              <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                {searching && results.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    Searching...
                  </p>
                ) : (
                  results.map((result) => (
                    <button
                      key={result.variantId}
                      type="button"
                      onClick={() => addItem(result)}
                      className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent"
                    >
                      <span>
                        <span className="font-medium">
                          {result.productName}
                        </span>
                        {result.variantLabel && (
                          <span className="text-muted-foreground">
                            {" "}
                            — {result.variantLabel}
                          </span>
                        )}
                        <span className="block text-xs text-muted-foreground">
                          SKU {result.sku || "—"}
                        </span>
                      </span>

                      <span className="shrink-0 text-xs text-muted-foreground">
                        Stock {result.stock}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No item added yet. Search above to add one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-28">Qty</TableHead>
                    <TableHead className="w-36">Purchase Price</TableHead>
                    <TableHead className="w-28 text-right">Total</TableHead>
                    <TableHead className="w-28">IMEI</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.variantId}>
                      <TableCell>
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.variantLabel || "—"} · in stock{" "}
                          {item.currentStock}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, { quantity: e.target.value })
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(index, { unitPrice: e.target.value })
                          }
                        />
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {(
                          (Number(item.quantity) || 0) *
                          (Number(item.unitPrice) || 0)
                        ).toLocaleString()}
                      </TableCell>

                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openImeiDialog(index)}
                        >
                          {item.imeis.length > 0
                            ? `${item.imeis.length} added`
                            : "Add"}
                        </Button>
                      </TableCell>

                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(index)}
                        >
                          <FiTrash2 className="text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="py-0 rounded shadow-sm">
          <CardHeader className="pt-3 px-3 border-b">
            <h4 className="text-lg font-semibold">Payment</h4>
          </CardHeader>

          <CardContent className="px-3 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="purchase-discount">Discount</Label>
                <Input
                  id="purchase-discount"
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchase-shipping">Shipping Cost</Label>
                <Input
                  id="purchase-shipping"
                  type="number"
                  min={0}
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="purchase-paid">Paid Now</Label>
                <Input
                  id="purchase-paid"
                  type="number"
                  min={0}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchase-method">Method</Label>
                <select
                  id="purchase-method"
                  className={selectClass}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="bank">Bank</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase-payref">Payment Reference</Label>
              <Input
                id="purchase-payref"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Trx ID / cheque no"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase-note">Note</Label>
              <Textarea
                id="purchase-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="py-0 rounded shadow-sm">
          <CardHeader className="pt-3 px-3 border-b">
            <h4 className="text-lg font-semibold">Summary</h4>
          </CardHeader>

          <CardContent className="px-3 py-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">
                ৳ {subtotal.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="tabular-nums">
                − ৳ {(Number(discount) || 0).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="tabular-nums">
                + ৳ {(Number(shippingCost) || 0).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Grand Total</span>
              <span className="tabular-nums">
                ৳ {grandTotal.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span className="tabular-nums">
                ৳ {(Number(paidAmount) || 0).toLocaleString()}
              </span>
            </div>

            <div
              className={`flex justify-between font-semibold ${
                due > 0 ? "text-destructive" : ""
              }`}
            >
              <span>Due</span>
              <span className="tabular-nums">৳ {due.toLocaleString()}</span>
            </div>

            <div className="flex flex-col gap-2 pt-4 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1"
                disabled={saving}
                onClick={() => savePurchase("pending")}
              >
                Save as Pending
              </Button>

              <Button
                className="flex-1"
                disabled={saving}
                onClick={() => savePurchase("received")}
              >
                <FiPlus className="mr-2" />
                {saving ? "Saving..." : "Save & Receive Stock"}
              </Button>
            </div>

            <p className="pt-1 text-xs text-muted-foreground">
              Stock only increases when a purchase is received. Save as pending
              if the goods have not arrived yet.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={imeiRow !== null} onOpenChange={() => setImeiRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              IMEI — {imeiRow !== null ? items[imeiRow]?.productName : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="imei-list">One IMEI per line</Label>
            <Textarea
              id="imei-list"
              rows={8}
              value={imeiText}
              onChange={(e) => setImeiText(e.target.value)}
              placeholder={"356938035643809\n356938035643810"}
            />
            <p className="text-xs text-muted-foreground">
              Scan them one after another. Leave empty for accessories that
              carry no IMEI.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImeiRow(null)}>
              Cancel
            </Button>

            <Button onClick={saveImeis}>Save IMEI</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddPurchasePage;
