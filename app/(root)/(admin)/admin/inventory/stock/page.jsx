"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FiEye, FiFileText } from "react-icons/fi";

import { showToast } from "@/lib/showToast";
import { formatNumberBD } from "@/lib/bdFormat";
import { useLocations } from "@/components/ui/Application/Admin/inventory/useInventory";
import {
  EmptyRow,
  ExportButtons,
  ListCard,
  Pagination,
  btn,
  filterInput,
  tdClass,
  thClass,
  theadClass,
  totalRowClass,
} from "@/components/ui/Application/Admin/listKit";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAGE_SIZES = [10, 25, 50, 100];

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A - Z)" },
  { value: "name-desc", label: "Name (Z - A)" },
  { value: "stock-desc", label: "Stock (High - Low)" },
  { value: "stock-asc", label: "Stock (Low - High)" },
  { value: "value-desc", label: "Stock value (High - Low)" },
];

const COLUMNS = [
  "SL",
  "Picture",
  "Name",
  "Branch",
  "AVG.P.P.",
  "L.P.P.",
  "Selling Price",
  "In Quantity",
  "Out Quantity",
  "Expire Quantity",
  "Stock",
  "Stock P.P.",
  "Stock S.P.",
  "Action",
];

const num = (value) => formatNumberBD(value);
const qty = (value, unit) => `${num(value)} ${unit}`;

/** The same figures the table shows, for Excel, PDF and print */
const exportRows = (rows) =>
  rows.map((row, index) => [
    index + 1,
    row.productName,
    row.locationName,
    row.avgPurchasePrice,
    row.lastPurchasePrice,
    row.sellingPrice,
    qty(row.inQuantity, row.unit),
    qty(row.outQuantity, row.unit),
    qty(row.expireQuantity, row.unit),
    qty(row.stock, row.unit),
    row.stockPP,
    row.stockSP,
  ]);

const EXPORT_HEAD = COLUMNS.filter((column) => column !== "Picture" && column !== "Action");

const totalsRow = (totals) => [
  "",
  "",
  "",
  "",
  "",
  "Total",
  num(totals.inQuantity),
  num(totals.outQuantity),
  num(totals.expireQuantity),
  num(totals.stock),
  num(totals.stockPP),
  num(totals.stockSP),
];

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const StockPage = () => {
  const { locations } = useLocations();

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [filterOptions, setFilterOptions] = useState({ brands: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [limit, setLimit] = useState(10);
  const [location, setLocation] = useState("all");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sort, setSort] = useState("name-asc");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [viewRow, setViewRow] = useState(null);
  const [reportRow, setReportRow] = useState(null);
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  const filterParams = useCallback(
    () => ({
      location,
      stock: stockFilter,
      sort,
      ...(brand && { brand }),
      ...(category && { category }),
      ...(search && { q: search }),
    }),
    [location, stockFilter, sort, brand, category, search],
  );

  const loadStock = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get("/api/inventory/stock-list", {
        params: { ...filterParams(), page, limit },
      });

      if (!data.success) {
        showToast("error", data.message || "Could not load stock");
        return;
      }

      setRows(data.data);
      setTotals(data.totals);
      setPages(data.pages);
      setTotal(data.total);
      setFilterOptions(data.filters);
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load stock");
    } finally {
      setLoading(false);
    }
  }, [filterParams, page, limit]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  // A new filter starts at the first page, or the list looks empty
  useEffect(() => {
    setPage(1);
  }, [location, stockFilter, sort, brand, category, search, limit]);

  const runSearch = () => {
    const next = searchInput.trim();

    if (next === search) loadStock();
    else setSearch(next);
  };

  /** Every row matching the filters, not only this page */
  const loadAllRows = async () => {
    setExporting(true);

    try {
      const { data } = await axios.get("/api/inventory/stock-list", {
        params: { ...filterParams(), all: 1 },
      });

      if (!data.success) throw new Error(data.message);

      return data;
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load stock");
      return null;
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = async () => {
    const data = await loadAllRows();
    if (!data) return;

    const XLSX = await import("xlsx");

    const sheet = XLSX.utils.aoa_to_sheet([
      EXPORT_HEAD,
      ...exportRows(data.data),
      totalsRow(data.totals),
    ]);

    const book = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(book, sheet, "Stock");
    XLSX.writeFile(book, "Stock.xlsx");
  };

  const exportPdf = async () => {
    const data = await loadAllRows();
    if (!data) return;

    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "landscape" });

    doc.text("Stock", 14, 15);

    autoTable(doc, {
      head: [EXPORT_HEAD],
      body: exportRows(data.data),
      foot: [totalsRow(data.totals)],
      startY: 22,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [21, 128, 61] },
      footStyles: { fillColor: [203, 213, 225], textColor: 20 },
    });

    doc.save("Stock.pdf");
  };

  const printStock = async () => {
    const data = await loadAllRows();
    if (!data) return;

    const win = window.open("", "_blank");

    if (!win) {
      showToast("error", "Allow pop-ups to print");
      return;
    }

    const cells = (values, tag) =>
      values.map((value) => `<${tag}>${escapeHtml(value)}</${tag}>`).join("");

    win.document.write(`<!doctype html>
<html><head><title>Stock</title>
<style>
  body { font-family: sans-serif; font-size: 11px; margin: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
  thead th { background: #15803d; color: #fff; }
  tfoot td { background: #cbd5e1; font-weight: bold; }
</style></head>
<body>
  <h2>Stock</h2>
  <table>
    <thead><tr>${cells(EXPORT_HEAD, "th")}</tr></thead>
    <tbody>${exportRows(data.data).map((row) => `<tr>${cells(row, "td")}</tr>`).join("")}</tbody>
    <tfoot><tr>${cells(totalsRow(data.totals), "td")}</tr></tfoot>
  </table>
</body></html>`);

    win.document.close();
    win.focus();
    win.print();
  };

  const openReport = async (row) => {
    setReportRow(row);
    setMovements([]);
    setMovementsLoading(true);

    try {
      const { data } = await axios.get("/api/inventory/movements", {
        params: { productId: row.productId, location: row.locationKey },
      });

      if (data.success) setMovements(data.data);
      else showToast("error", data.message || "Could not load movements");
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load movements");
    } finally {
      setMovementsLoading(false);
    }
  };

  const firstShown = total === 0 ? 0 : (page - 1) * limit + 1;

  return (
    <div>
      <ListCard title="Stock">
          <div className="flex flex-wrap items-center gap-[8px]">
            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              className={`${filterInput} !w-auto`}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>

            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className={`${filterInput} !w-auto`}
            >
              {locations.length !== 1 && <option value="all">All Branches</option>}

              {locations.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              className={`${filterInput} !w-auto`}
            >
              <option value="">All Brands</option>

              {filterOptions.brands.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={`${filterInput} !w-auto min-w-44`}
            >
              <option value="">All Categories</option>

              {filterOptions.categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value)}
              className={`${filterInput} !w-auto`}
            >
              <option value="all">All</option>
              <option value="in">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className={`${filterInput} !w-auto`}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && runSearch()}
              placeholder="Search product, SKU or barcode..."
              className={`${filterInput} min-w-[220px] flex-1`}
            />

            <button type="button" onClick={runSearch} className={btn.info}>
              Search
            </button>
          </div>

          <div className="mt-[16px] flex flex-wrap items-center gap-2">
            <ExportButtons
              disabled={exporting}
              onPdf={exportPdf}
              onExcel={exportExcel}
              onPrint={printStock}
            />
            {exporting && <span className="text-[12px] text-[#98a6ad]">Preparing…</span>}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className={theadClass}>
                  {COLUMNS.map((column) => (
                    <th
                      key={column}
                      className={thClass}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading &&
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index}>
                      {COLUMNS.map((column) => (
                        <td key={column} className={tdClass}>
                          <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!loading && rows.length === 0 && (
                  <EmptyRow colSpan={COLUMNS.length} title="No stock matches this filter" />
                )}

                {!loading &&
                  rows.map((row, index) => (
                    <tr key={row._id} className="hover:bg-[#f5f7f9] dark:hover:bg-muted/50">
                      <td className={tdClass}>{firstShown + index}</td>

                      <td className={tdClass}>
                        {row.image ? (
                          <img
                            src={row.image}
                            alt={row.productName}
                            className="h-8 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="h-8 w-10 rounded bg-muted" />
                        )}
                      </td>

                      <td className={`${tdClass} max-w-48`}>{row.productName}</td>
                      <td className={tdClass}>{row.locationName}</td>
                      <td className={tdClass}>{num(row.avgPurchasePrice)}</td>
                      <td className={tdClass}>{num(row.lastPurchasePrice)}</td>
                      <td className={tdClass}>{num(row.sellingPrice)}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        {qty(row.inQuantity, row.unit)}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        {qty(row.outQuantity, row.unit)}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        {qty(row.expireQuantity, row.unit)}
                      </td>
                      <td
                        className={`${tdClass} whitespace-nowrap ${
                          row.stock <= 0
                            ? "font-semibold text-red-600"
                            : row.stock <= row.lowAt
                              ? "font-semibold text-amber-600"
                              : ""
                        }`}
                      >
                        {qty(row.stock, row.unit)}
                      </td>
                      <td className={tdClass}>{num(row.stockPP)}</td>
                      <td className={tdClass}>{num(row.stockSP)}</td>

                      <td className={tdClass}>
                        <div className="flex">
                          <button
                            type="button"
                            title="View variants"
                            onClick={() => setViewRow(row)}
                            className="rounded-l-[4px] bg-[#188ae2] px-3 py-1.5 text-white hover:bg-[#1379c7]"
                          >
                            <FiEye />
                          </button>
                          <button
                            type="button"
                            title="Stock movements"
                            onClick={() => openReport(row)}
                            className="rounded-r-[4px] bg-[#10c469] px-3 py-1.5 text-white hover:bg-[#0dab5b]"
                          >
                            <FiFileText />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>

              {!loading && totals && rows.length > 0 && (
                <tfoot>
                  <tr className={totalRowClass}>
                    <td colSpan={6} className={tdClass} />
                    <td className={tdClass}>Total</td>
                    <td className={tdClass}>{num(totals.inQuantity)}</td>
                    <td className={tdClass}>{num(totals.outQuantity)}</td>
                    <td className={tdClass}>{num(totals.expireQuantity)}</td>
                    <td className={tdClass}>{num(totals.stock)}</td>
                    <td className={tdClass}>{num(totals.stockPP)}</td>
                    <td className={tdClass}>{num(totals.stockSP)}</td>
                    <td className={tdClass} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <Pagination
            page={page}
            pages={pages}
            from={firstShown}
            count={rows.length}
            total={total}
            onPage={setPage}
          />
      </ListCard>

      <Dialog open={!!viewRow} onOpenChange={(open) => !open && setViewRow(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewRow?.productName}</DialogTitle>
            <DialogDescription>
              {viewRow?.locationName} · {viewRow?.category}
              {viewRow?.brand ? ` · ${viewRow.brand}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted text-left">
                  {["Variant", "SKU", "P.P.", "S.P.", "In", "Out", "Expire", "Stock"].map(
                    (column) => (
                      <th key={column} className="border px-2 py-1.5">
                        {column}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {viewRow?.variants.map((variant) => (
                  <tr key={variant.variantId}>
                    <td className="border px-2 py-1.5">{variant.label}</td>
                    <td className="border px-2 py-1.5 text-xs text-muted-foreground">
                      {variant.sku}
                      {variant.barcode ? ` · ${variant.barcode}` : ""}
                    </td>
                    <td className="border px-2 py-1.5">{num(variant.purchasePrice)}</td>
                    <td className="border px-2 py-1.5">{num(variant.sellingPrice)}</td>
                    <td className="border px-2 py-1.5">{num(variant.inQuantity)}</td>
                    <td className="border px-2 py-1.5">{num(variant.outQuantity)}</td>
                    <td className="border px-2 py-1.5">{num(variant.expireQuantity)}</td>
                    <td className="border px-2 py-1.5 font-medium">
                      {qty(variant.stock, viewRow.unit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reportRow} onOpenChange={(open) => !open && setReportRow(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{reportRow?.productName} — stock movements</DialogTitle>
            <DialogDescription>
              {reportRow?.locationName}. Sales are not listed here; they show up
              in Out Quantity.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-auto">
            {movementsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : movements.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No movements recorded
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted text-left">
                    {["Date", "Type", "Variant", "Change", "Before", "After", "Note"].map(
                      (column) => (
                        <th key={column} className="border px-2 py-1.5">
                          {column}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement._id}>
                      <td className="whitespace-nowrap border px-2 py-1.5">
                        {new Date(movement.date).toLocaleString("en-GB")}
                      </td>
                      <td className="border px-2 py-1.5">{movement.type}</td>
                      <td className="border px-2 py-1.5">{movement.variantLabel}</td>
                      <td
                        className={`border px-2 py-1.5 font-medium ${
                          movement.change < 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {movement.change > 0 ? "+" : ""}
                        {num(movement.change)}
                      </td>
                      <td className="border px-2 py-1.5">{num(movement.previousStock)}</td>
                      <td className="border px-2 py-1.5">{num(movement.newStock)}</td>
                      <td className="border px-2 py-1.5 text-xs text-muted-foreground">
                        {movement.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockPage;
