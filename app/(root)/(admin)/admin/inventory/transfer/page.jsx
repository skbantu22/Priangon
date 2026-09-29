"use client";

import { useEffect, useMemo, useState } from "react";
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

const transferThead = "bg-[#b300b3] text-white";

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
      <span
        className="inline-flex size-[15px] items-center justify-center rounded-full bg-[#35b8e0] text-[10px] font-bold leading-none text-white"
        title="Info"
        aria-hidden
      >
        i
      </span>
    </label>
  );
}

/** Shop-to-shop transfer. Stock leaves the shop selected in the top switch. */
export default function TransferPage() {
  const picked = usePosShowroomId();
  const auth = useSelector((state) => state.authStore.auth);
  const currentUser = getPosCurrentUser(auth);
  const { data: showrooms = [] } = useQuery(posShowroomsQueryOptions());

  const sourceId =
    currentUser && currentUser.role !== "admin" && !currentUser.showroomId
      ? ""
      : resolvePosTill({ picked, showrooms, currentUser });
  const shops = useMemo(
    () => showrooms.filter((shop) => shop?._id && shop.isActive !== false),
    [showrooms],
  );
  const source = shops.find((shop) => String(shop._id) === String(sourceId));
  const destinations = shops.filter((shop) => String(shop._id) !== String(sourceId));

  const [branchId, setBranchId] = useState("");
  const [transferDate, setTransferDate] = useState(() => today());
  const [multiple, setMultiple] = useState(false);
  const [busy, setBusy] = useState(false);
  const { items, setItems, updateItem, removeItem, clearItems } = useItemRows();

  useEffect(() => {
    clearItems();
    setBranchId("");
  }, [sourceId, clearItems]);

  const totalQuantity = items.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);

  const takeProduct = (product) => {
    const stock = Number(product.stock) || 0;

    if (stock < 1) {
      showToast("error", `"${product.productName}" has no stock in this shop`);
      return;
    }

    if (!multiple) {
      setItems([{ ...product, quantity: 1, type: "subtract" }]);
      return;
    }

    const existing = items.find((row) => row.variantId === product.variantId);

    if (existing && Number(existing.quantity) >= stock) {
      showToast("error", `"${product.productName}" can transfer at most ${stock}`);
      return;
    }

    setItems((current) => {
      const index = current.findIndex((row) => row.variantId === product.variantId);

      if (index === -1) {
        return [...current, { ...product, quantity: 1, type: "subtract" }];
      }

      const next = [...current];
      next[index] = {
        ...next[index],
        stock,
        quantity: Math.min(stock, Number(next[index].quantity) + 1),
      };
      return next;
    });
  };

  const save = async () => {
    if (!source) {
      showToast("error", "Switch to a shop before transferring stock");
      return;
    }

    if (!branchId) {
      showToast("error", "Select a branch");
      return;
    }

    if (branchId === String(sourceId)) {
      showToast("error", "Choose a different branch");
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
        sourceId,
        toId: branchId,
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
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not transfer stock",
      );
    } finally {
      setBusy(false);
    }
  };

  const purpleTh = `${thClass} border-[#9e009e] !text-white`;
  const purpleTd = `${tdClass} border-[#e8e8e8]`;

  return (
    <div className="-mx-3 space-y-4 bg-[#f0f2f5] px-3 py-4 sm:-mx-5 sm:px-5 md:-mx-8 md:px-8">
      <AmarCard title="Stock Transferred">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <LabelWithInfo label="Branch" htmlFor="transfer-branch" />
            <select
              id="transfer-branch"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className={filterInput}
            >
              <option value="">Select Branch</option>
              {destinations.map((shop) => (
                <option key={shop._id} value={String(shop._id)}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <LabelWithInfo label="Date" htmlFor="transfer-date" />
            <input
              id="transfer-date"
              type="date"
              value={transferDate}
              onChange={(event) => setTransferDate(event.target.value)}
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
            key={sourceId || "none"}
            location={sourceId || ""}
            stockedOnly
            amarSearch
            disabled={!source}
            onAdd={takeProduct}
            placeholder="Enter Product Name/Sku/scan barcode"
          />
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className={transferThead}>
                <th className={purpleTh}>Product Name</th>
                <th className={`${purpleTh} text-right`}>Stock Quantity</th>
                <th className={purpleTh}>Transfer Quantity</th>
                <th className={`${purpleTh} w-12 text-center`} aria-label="Remove">
                  <Trash2 size={16} className="mx-auto text-white" strokeWidth={2} />
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.variantId}>
                  <td className={purpleTd}>
                    <b className="block font-medium">{row.productName}</b>
                    <span className="block text-[12px] text-muted-foreground">
                      {row.variantLabel}
                      {row.sku ? ` · ${row.sku}` : ""}
                    </span>
                  </td>
                  <td className={`${purpleTd} text-right`}>{row.stock}</td>
                  <td className={purpleTd}>
                    <input
                      type="number"
                      min={1}
                      max={row.stock}
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
                          quantity: Math.min(stock, Math.max(1, next)),
                        });
                      }}
                      className={`${cell} w-[110px]`}
                      aria-label={`Transfer quantity for ${row.productName}`}
                    />
                  </td>
                  <td className={`${purpleTd} text-center`}>
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
              <tr className={totalRowClass}>
                <td className={purpleTd} colSpan={2}>
                  Total Quantity :
                </td>
                <td className={purpleTd}>{totalQuantity}</td>
                <td className={purpleTd} />
              </tr>
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
            {busy ? "Transferring…" : "Transfer Stock"}
          </button>
        </div>
      </AmarCard>
    </div>
  );
}
