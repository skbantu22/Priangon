"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FiArrowRight, FiSend, FiTrash2 } from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import VariantPicker from "@/components/ui/Application/Admin/inventory/VariantPicker";
import { showToast } from "@/lib/showToast";
import {
  ADMIN_DASHBOARD,
  ADMIN_INVENTORY_TRANSFER,
  ADMIN_INVENTORY_TRANSFERRED,
} from "@/Route/Adminpannelroute";

import {
  selectClass,
  useItemRows,
  useLocations,
} from "@/components/ui/Application/Admin/inventory/useInventory";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  { href: ADMIN_INVENTORY_TRANSFER, label: "Transfer" },
];

const today = () => new Date().toISOString().slice(0, 10);

const TransferPage = () => {
  const router = useRouter();
  const { locations } = useLocations();

  const [from, setFrom] = useState("warehouse");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { items, addItem, updateItem, removeItem, clearItems } = useItemRows();

  // Wait for the list before deciding where stock is coming from, so a
  // cashier tied to one showroom does not start on the warehouse
  useEffect(() => {
    if (locations.length === 0) return;

    setFrom((current) =>
      locations.some((item) => item.key === current) ? current : locations[0].key,
    );
  }, [locations]);

  // The rows carry the stock held at the sending end
  useEffect(() => {
    clearItems();
  }, [from, clearItems]);

  const destinations = useMemo(
    () => locations.filter((item) => item.key !== from),
    [locations, from],
  );

  useEffect(() => {
    if (destinations.length === 0) {
      setTo("");
      return;
    }

    setTo((current) =>
      destinations.some((item) => item.key === current)
        ? current
        : destinations[0].key,
    );
  }, [destinations]);

  const totalUnits = items.reduce(
    (sum, row) => sum + (Number(row.quantity) || 0),
    0,
  );

  const sendTransfer = async () => {
    if (!to) {
      showToast("error", "Choose where the stock is going");
      return;
    }

    if (items.length === 0) {
      showToast("error", "Add at least one product");
      return;
    }

    const overSent = items.find(
      (row) => Number(row.quantity) > Number(row.stock),
    );

    if (overSent) {
      showToast(
        "error",
        `"${overSent.productName}" has only ${overSent.stock} at the sending end`,
      );
      return;
    }

    setBusy(true);

    try {
      const { data } = await axios.post("/api/inventory/transfers", {
        from,
        to,
        transferDate: date,
        note,
        items: items.map((row) => ({
          variantId: row.variantId,
          quantity: Number(row.quantity),
        })),
      });

      if (!data.success) {
        showToast("error", data.message || "Could not send the transfer");
        return;
      }

      showToast("success", data.message);
      clearItems();
      setNote("");
      router.push(ADMIN_INVENTORY_TRANSFERRED);
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not send the transfer",
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
          <h1 className="text-lg font-semibold">Transfer stock</h1>
          <p className="text-sm text-muted-foreground">
            Units leave the sending end straight away and land only once the
            other side receives them
          </p>
        </CardHeader>

        <CardContent className="grid gap-5 pt-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="grid gap-2">
              <Label>From</Label>

              <select
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className={selectClass}
              >
                {locations.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden items-end justify-center pb-2 sm:flex">
              <FiArrowRight className="size-5 text-muted-foreground" />
            </div>

            <div className="grid gap-2">
              <Label>To</Label>

              <select
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className={selectClass}
              >
                {destinations.length === 0 && (
                  <option value="">No other location</option>
                )}

                {destinations.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label>Date</Label>

              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Add products</Label>

            <VariantPicker location={from} onAdd={addItem} />
          </div>

          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">At sender</TableHead>
                  <TableHead className="w-32">Send quantity</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Scan or search a product to start the transfer
                    </TableCell>
                  </TableRow>
                )}

                {items.map((row) => {
                  const over = Number(row.quantity) > Number(row.stock);

                  return (
                    <TableRow key={row.variantId}>
                      <TableCell>
                        <span className="block font-medium">
                          {row.productName}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {row.variantLabel}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {row.sku || "—"}
                      </TableCell>

                      <TableCell className="text-right">{row.stock}</TableCell>

                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          max={row.stock}
                          value={row.quantity}
                          onChange={(event) =>
                            updateItem(row.variantId, {
                              quantity: event.target.value,
                            })
                          }
                          className={over ? "border-red-500" : ""}
                        />

                        {over && (
                          <span className="text-xs text-red-500">
                            Only {row.stock} available
                          </span>
                        )}
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
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-2">
            <Label>Note</Label>

            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Who is carrying it, vehicle, challan number"
              rows={2}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {items.length} product{items.length === 1 ? "" : "s"} ·{" "}
              <span className="font-semibold text-foreground">
                {totalUnits} unit{totalUnits === 1 ? "" : "s"}
              </span>
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={clearItems} disabled={busy}>
                Clear
              </Button>

              <Button onClick={sendTransfer} disabled={busy}>
                <FiSend /> {busy ? "Sending…" : "Send transfer"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferPage;
