"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Trash2 } from "lucide-react";

import VariantPicker from "@/components/ui/Application/Admin/inventory/VariantPicker";
import { useItemRows } from "@/components/ui/Application/Admin/inventory/useInventory";
import { showToast } from "@/lib/showToast";
import {
  btn,
  filterInput,
  tdClass,
  thClass,
  totalRowClass,
} from "@/components/ui/Application/Admin/listKit";
import { cell, today } from "@/components/ui/Application/Admin/purchase/purchaseKit";
import {
  getPosCurrentUser,
  posShowroomsQueryOptions,
  resolvePosTill,
  usePosShowroomId,
} from "@/lib/posProducts";
import {
  ADMIN_INVENTORY_ADJUSTMENTS,
} from "@/Route/Adminpannelroute";

const greenThead = "bg-[#00801a] text-white";

function AmarCard({ title, children }) {
  return (
    <section className="rounded-[4px] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      {title ? (
        <h1 className="m-0 mb-4 text-[15px] font-bold text-[#212529]">{title}</h1>
      ) : null}
      {children}
    </section>
  );
}

function LabelWithInfo({ label, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-[6px] flex items-center gap-1.5 text-[14px] font-normal text-[#212529]"
    >
      {label}
    </label>
  );
}

/** New stock adjustment for the shop selected in the top branch switch. */
export default function NewAdjustmentPage() {
  const picked = usePosShowroomId();
  const auth = useSelector((state) => state.authStore.auth);
  const currentUser = getPosCurrentUser(auth);
  const { data: showrooms = [] } = useQuery(posShowroomsQueryOptions());

  const sourceId =
    currentUser && currentUser.role !== "admin" && !currentUser.showroomId
      ? ""
      : resolvePosTill({ picked, showrooms, currentUser });

  const source = showrooms.find((shop) => String(shop._id) === String(sourceId));

  const [adjustmentType, setAdjustmentType] = useState("subtract");
  const [adjustmentDate, setAdjustmentDate] = useState(() => today());
  const [multiple, setMultiple] = useState(false);
  const [busy, setBusy] = useState(false);

  const { items, setItems, updateItem, removeItem, clearItems } = useItemRows();

  useEffect(() => {
    clearItems();
  }, [sourceId, adjustmentType, clearItems]);

  const stockedOnly = adjustmentType === "subtract";

  const takeProduct = (product) => {
    if (adjustmentType === "subtract") {
      const stock = Number(product.stock) || 0;

      if (stock < 1) {
        showToast("error", `"${product.productName}" has no stock in this shop`);
        return;
      }
    }

    if (!multiple) {
      setItems([{ ...product, quantity: 1, type: adjustmentType === "add" ? "add" : "subtract" }]);
      return;
    }

    if (adjustmentType === "subtract") {
      const existing = items.find((row) => row.variantId === product.variantId);
      const stock = Number(product.stock) || 0;

      if (existing && Number(existing.quantity) >= stock) {
        showToast("error", `"${product.productName}" cannot deduct more than ${stock}`);
        return;
      }
    }

    setItems((current) => {
      const index = current.findIndex((row) => row.variantId === product.variantId);

      if (index === -1) {
        return [
          ...current,
          { ...product, quantity: 1, type: adjustmentType === "add" ? "add" : "subtract" },
        ];
      }

      const next = [...current];
      const stock = Number(product.stock) || 0;
      const bump = Number(next[index].quantity) + 1;

      next[index] = {
        ...next[index],
        stock,
        quantity:
          adjustmentType === "subtract" ? Math.min(stock, bump) : bump,
      };

      return next;
    });
  };

  const save = async () => {
    if (!source) {
      showToast("error", "Switch to a shop before adjusting stock");
      return;
    }

    if (items.length === 0) {
      showToast("error", "Add at least one product");
      return;
    }

    const invalid = items.find((row) => {
      const quantity = Number(row.quantity);
      if (!Number.isFinite(quantity) || quantity < 1) return true;
      if (adjustmentType === "subtract" && quantity > Number(row.stock || 0)) return true;
      return false;
    });

    if (invalid) {
      showToast(
        "error",
        adjustmentType === "subtract"
          ? `"${invalid.productName}" can deduct at most ${invalid.stock || 0}`
          : `Enter a valid quantity for "${invalid.productName}"`,
      );
      return;
    }

    setBusy(true);

    try {
      const { data } = await axios.post("/api/inventory/adjustments", {
        showroomId: sourceId,
        adjustmentType,
        adjustmentDate,
        items: items.map((row) => ({
          variantId: row.variantId,
          quantity: Number(row.quantity),
        })),
      });

      if (!data.success) {
        showToast("error", data.message || "Could not save adjustment");
        return;
      }

      showToast("success", data.message);
      clearItems();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not save adjustment",
      );
    } finally {
      setBusy(false);
    }
  };

  const greenTh = `${thClass} border-[#007015] !text-white`;
  const greenTd = `${tdClass} border-[#e8e8e8]`;

  const totalQty = items.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);

  return (
    <div className="-mx-3 space-y-4 bg-[#f0f2f5] px-3 py-4 sm:-mx-5 sm:px-5 md:-mx-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="m-0 text-[19px] font-semibold text-[#212529]">New Stock Adjustment</h1>
        <Link href={ADMIN_INVENTORY_ADJUSTMENTS} className={btn.secondary}>
          Back to List
        </Link>
      </div>

      <AmarCard title="Shop & type">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <LabelWithInfo label="Shop" htmlFor="adj-shop" />
            <input
              id="adj-shop"
              readOnly
              value={source?.name || "Switch to a shop"}
              className={`${filterInput} bg-[#f8f9fa]`}
            />
          </div>
          <div>
            <LabelWithInfo label="Type" htmlFor="adj-type" />
            <select
              id="adj-type"
              value={adjustmentType}
              onChange={(event) => setAdjustmentType(event.target.value)}
              className={filterInput}
            >
              <option value="add">Addition</option>
              <option value="subtract">Deduction</option>
            </select>
          </div>
          <div>
            <LabelWithInfo label="Date" htmlFor="adj-date" />
            <input
              id="adj-date"
              type="date"
              value={adjustmentDate}
              onChange={(event) => setAdjustmentDate(event.target.value)}
              className={filterInput}
            />
          </div>
        </div>
      </AmarCard>

      <AmarCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex shrink-0 items-center gap-2 text-[14px] text-[#212529]">
            <input
              type="checkbox"
              checked={multiple}
              onChange={(event) => setMultiple(event.target.checked)}
              className="size-4 rounded border-[#ced4da]"
            />
            Multiple
          </label>
          <VariantPicker
            key={`${sourceId}-${adjustmentType}`}
            location={sourceId || ""}
            stockedOnly={stockedOnly}
            amarSearch
            disabled={!source}
            onAdd={takeProduct}
            placeholder="Enter Product Name/Sku/scan barcode"
          />
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className={greenThead}>
                <th className={greenTh}>Product Name</th>
                <th className={`${greenTh} text-right`}>Stock Quantity</th>
                <th className={greenTh}>Adjust Quantity</th>
                <th className={`${greenTh} w-12 text-center`} aria-label="Remove">
                  <Trash2 size={16} className="mx-auto text-white" strokeWidth={2} />
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className={`${greenTd} py-8 text-center text-[#98a6ad]`}>
                    Add a product above
                  </td>
                </tr>
              )}

              {items.map((row) => (
                <tr key={row.variantId}>
                  <td className={greenTd}>
                    <b className="block font-medium">{row.productName}</b>
                    <span className="block text-[12px] text-muted-foreground">
                      {row.variantLabel}
                      {row.sku ? ` · ${row.sku}` : ""}
                    </span>
                  </td>
                  <td className={`${greenTd} text-right`}>{row.stock ?? "—"}</td>
                  <td className={greenTd}>
                    <input
                      type="number"
                      min={1}
                      max={adjustmentType === "subtract" ? row.stock : undefined}
                      value={row.quantity}
                      onChange={(event) => {
                        const raw = event.target.value;
                        if (raw === "") {
                          updateItem(row.variantId, { quantity: "" });
                          return;
                        }
                        const stock = Number(row.stock) || 0;
                        const next = Math.floor(Number(raw));
                        if (!Number.isFinite(next)) return;
                        updateItem(row.variantId, {
                          quantity:
                            adjustmentType === "subtract"
                              ? Math.min(stock, Math.max(1, next))
                              : Math.max(1, next),
                        });
                      }}
                      className={`${cell} w-[110px]`}
                      aria-label={`Quantity for ${row.productName}`}
                    />
                  </td>
                  <td className={`${greenTd} text-center`}>
                    <button
                      type="button"
                      onClick={() => removeItem(row.variantId)}
                      className="inline-flex p-1 text-[#6c757d] hover:text-[#ff5b5b]"
                      aria-label={`Remove ${row.productName}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {items.length > 0 && (
                <tr className={totalRowClass}>
                  <td className={greenTd} colSpan={2}>
                    Total Quantity :
                  </td>
                  <td className={greenTd}>{totalQty}</td>
                  <td className={greenTd} />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={busy || !source}
            className={`${btn.primary} min-w-[130px] !px-4 !py-[6px] !text-[14px]`}
          >
            {busy ? "Saving…" : "Save Adjustment"}
          </button>
        </div>
      </AmarCard>
    </div>
  );
}
