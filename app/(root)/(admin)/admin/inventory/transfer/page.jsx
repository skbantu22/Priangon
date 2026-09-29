"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { Trash2 } from "lucide-react";

import VariantPicker from "@/components/ui/Application/Admin/inventory/VariantPicker";
import { useItemRows, useLocations } from "@/components/ui/Application/Admin/inventory/useInventory";
import { showToast } from "@/lib/showToast";
import { ListCard, btn, filterInput, tdClass, thClass, theadClass } from "@/components/ui/Application/Admin/listKit";
import { Field, cell } from "@/components/ui/Application/Admin/purchase/purchaseKit";

const today = () => new Date().toISOString().slice(0, 10);

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
    <div className="space-y-4">
      <ListCard title="Stock Transfer">
        <p className="m-0 mb-4 text-[13px] text-muted-foreground">
          Send goods from the warehouse to the sale center
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="From" htmlFor="transfer-from">
            <input id="transfer-from" value="Warehouse" readOnly className={filterInput} />
          </Field>
          <Field label="Branch" htmlFor="transfer-branch">
            <input
              id="transfer-branch"
              value={saleCenter?.name || "Sale center not set"}
              readOnly
              className={filterInput}
            />
          </Field>
          <Field label="Date" htmlFor="transfer-date">
            <input
              id="transfer-date"
              type="date"
              value={transferDate}
              onChange={(event) => setTransferDate(event.target.value)}
              className={filterInput}
            />
          </Field>
        </div>
      </ListCard>

      <ListCard title="Products">
        <Field label="Product">
          <VariantPicker
            location="warehouse"
            onAdd={addItem}
            placeholder="Enter Product Name/Sku/scan barcode"
          />
        </Field>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className={theadClass}>
                <th className={thClass}>Product Name</th>
                <th className={`${thClass} text-right`}>Stock Quantity</th>
                <th className={thClass}>Transfer Quantity</th>
                <th className={`${thClass} w-12 text-center`} aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className={`${tdClass} py-10 text-center text-muted-foreground`}>
                    Search a product to add it
                  </td>
                </tr>
              )}

              {items.map((row) => (
                <tr key={row.variantId}>
                  <td className={tdClass}>
                    <b className="block font-medium">{row.productName}</b>
                    <span className="block text-[12px] text-muted-foreground">
                      {row.variantLabel}
                      {row.sku ? ` · ${row.sku}` : ""}
                    </span>
                  </td>
                  <td className={`${tdClass} text-right`}>{row.stock}</td>
                  <td className={tdClass}>
                    <input
                      type="number"
                      min={1}
                      max={row.stock}
                      value={row.quantity}
                      onChange={(event) =>
                        updateItem(row.variantId, { quantity: event.target.value })
                      }
                      className={`${cell} w-[110px]`}
                      aria-label={`Transfer quantity for ${row.productName}`}
                    />
                  </td>
                  <td className={`${tdClass} text-center`}>
                    <button
                      type="button"
                      onClick={() => removeItem(row.variantId)}
                      className="rounded-[4px] bg-[#ff5b5b] p-1.5 text-white hover:bg-[#f24242]"
                      aria-label={`Remove ${row.productName}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-[18px] flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={busy || !saleCenter}
            className={`${btn.success} min-w-[140px] !text-[15px]`}
          >
            {busy ? "Transferring…" : "Transfer Stock"}
          </button>
        </div>
      </ListCard>
    </div>
  );
}
