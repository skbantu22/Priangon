"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { FiTrash2 } from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import VariantPicker from "@/components/ui/Application/Admin/inventory/VariantPicker";
import { useItemRows, useLocations } from "@/components/ui/Application/Admin/inventory/useInventory";
import { showToast } from "@/lib/showToast";
import { ADMIN_DASHBOARD, ADMIN_INVENTORY_TRANSFER } from "@/Route/Adminpannelroute";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const today = () => new Date().toISOString().slice(0, 10);

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_INVENTORY_TRANSFER, label: "Transfer" },
];

/** Warehouse to the sale center. Stock stays in transit until Received List. */
export default function TransferPage() {
  const { locations } = useLocations();
  const saleCenter = useMemo(
    () => locations.find((item) => item.isSaleCenter),
    [locations],
  );

  const [transferDate, setTransferDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const { items, addItem, updateItem, removeItem, clearItems } = useItemRows();

  const save = async () => {
    if (!saleCenter) {
      showToast("error", "Set a sale center before transferring stock");
      return;
    }

    if (items.length === 0) {
      showToast("error", "Add at least one product");
      return;
    }

    const invalid = items.find((row) => {
      const quantity = Number(row.quantity);
      return !Number.isFinite(quantity) || quantity < 1 || quantity > Number(row.stock || 0);
    });

    if (invalid) {
      showToast(
        "error",
        `"${invalid.productName}" can transfer at most ${invalid.stock || 0}`,
      );
      return;
    }

    setBusy(true);

    try {
      const { data } = await axios.post("/api/inventory/transfers", {
        transferDate,
        items: items.map((row) => ({
          variantId: row.variantId,
          quantity: Number(row.quantity),
        })),
      });

      if (!data.success) {
        showToast("error", data.message || "Could not transfer stock");
        return;
      }

      showToast("success", data.message);
      clearItems();
      setTransferDate(today());
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not transfer stock",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card>
        <CardHeader className="border-b">
          <h1 className="text-lg font-semibold">Stock Transfer</h1>
          <p className="text-sm text-muted-foreground">
            Send goods from the warehouse to the sale center
          </p>
        </CardHeader>

        <CardContent className="grid gap-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>From</Label>
              <Input value="Warehouse" readOnly />
            </div>

            <div className="grid gap-2">
              <Label>Branch</Label>
              <Input value={saleCenter?.name || "Sale center not set"} readOnly />
            </div>

            <div className="grid gap-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={transferDate}
                onChange={(event) => setTransferDate(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Product</Label>
            <VariantPicker
              location="warehouse"
              onAdd={addItem}
              placeholder="Enter Product Name/Sku/scan barcode"
            />
          </div>

          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">Stock Quantity</TableHead>
                  <TableHead className="w-36">Transfer Quantity</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Search a product to add it
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
                      <Input
                        type="number"
                        min={1}
                        max={row.stock}
                        value={row.quantity}
                        onChange={(event) =>
                          updateItem(row.variantId, { quantity: event.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(row.variantId)}
                      >
                        <FiTrash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={busy || !saleCenter}>
              {busy ? "Transferring…" : "Transfer Stock"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
