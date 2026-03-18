"use client";

import SaveAltIcon from "@mui/icons-material/SaveAlt";
import React, { useState } from "react";
import Link from "next/link";
import axios from "axios";

import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";

import {
  MaterialReactTable,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleFullScreenButton,
  MRT_ToggleGlobalFilterButton,
  useMaterialReactTable,
} from "material-react-table";

import { Tooltip, IconButton } from "@mui/material";

import RecyclingIcon from "@mui/icons-material/Recycling";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";

import { mkConfig, generateCsv, download } from "export-to-csv";

import { showToast } from "@/lib/showToast";
import useDeleteMutation from "@/hook/useDeleteMutation";
import ButtonLoading from "../ButtonLoading";
const Datatable = ({
  queryKey,
  fetchUrl,
  columnsConfig,
  initialPageSize = 10,
  exportEndpoint,
  deleteEndpoint,
  deleteType = "SD",
  trashView,
  createAction,
}) => {
  const queryClient = useQueryClient();

  // filter , sorting and pagination states
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const [rowSelection, setRowSelection] = useState({});
  const [exportLoading, setExportLoading] = useState(false);

 // ✅ Delete mutation
  const deleteMutation = useDeleteMutation(queryKey, deleteEndpoint);

 

  // ✅ helpers (put above handleExport in same component file)
const makeCsvSafe = (val) => {
  if (val === null || val === undefined) return "";
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return val;
  if (val instanceof Date) return val.toISOString();
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
};

// ✅ subcategory text (supports subcategory / subcategories)
const getSubcatText = (row) => {
  const arr =
    Array.isArray(row?.subcategories) ? row.subcategories :
    Array.isArray(row?.subcategory) ? row.subcategory :
    row?.subcategory ? [row.subcategory] :
    [];

  return arr
    .map((s) => (s?.name || s?.slug || s?._id || s)) // name first
    .filter(Boolean)
    .join(" | ");
};

// ✅ choose what columns go to CSV (edit if you want)
const toCsvRow = (row) => ({
  _id: makeCsvSafe(row?._id),
  name: makeCsvSafe(row?.name),
  slug: makeCsvSafe(row?.slug),
  subcategory: makeCsvSafe(getSubcatText(row)),
  createdAt: row?.createdAt ? new Date(row.createdAt).toISOString() : "",
  updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : "",
});

// ✅ FULL FIXED handleExport (same name)
const handleExport = async (selectedRows) => {
  setExportLoading(true);

  try {
    const csvConfig = mkConfig({
      fieldSeparator: ",",
      decimalSeparator: ".",
      useKeysAsHeaders: true,
      filename: "csv-data",
    });

    let rows = [];

    // ✅ selected rows export
    if (Object.keys(rowSelection).length > 0) {
      rows = selectedRows.map((r) => r.original);
    } else {
      const { data: response } = await axios.get(exportEndpoint);

      if (!response?.success) throw new Error(response?.message || "Export failed");

      rows = response?.data || [];
    }

    // ✅ make values CSV safe (optional but good)
    const safeRows = rows.map((row) => {
      const out = {};
      for (const k in row) out[k] = makeCsvSafe(row[k]);
      return out;
    });

    const csv = generateCsv(csvConfig)(safeRows);
    download(csvConfig)(csv);

    showToast("success", "CSV exported");
  } catch (error) {
    showToast("error", error?.message || "Export failed");
  } finally {
    setExportLoading(false);
  }
};



   // ✅ handle delete method
  const handleDelete = (ids, dt) => {
    let c;

    if (dt === "PD") {
      c = confirm("Are you sure you want to delete the data permanently?");
    } else if (dt === "RSD") {
      c = confirm("Are you sure you want to restore the data?");
    } else {
      c = confirm("Are you sure you want to move data into trash?");
    }

    if (c) {
  deleteMutation.mutate(
    { ids, deleteType: dt },
    {
      onSuccess: (res) => {
        if (res?.success) {
          if (dt === "SD") showToast("success", "Moved to Trash 🗑️");
          else if (dt === "RSD") showToast("success", "Restored ✅");
          else if (dt === "PD") showToast("success", "Deleted Permanently ❌");
          else showToast("success", res?.message || "Done");
          

    queryClient.invalidateQueries({ queryKey: [queryKey] });
           
        } else {
          showToast("error", res?.message || "Action failed");
        }
      },
      onError: (err) => {
        showToast(
          "error",
          err?.response?.data?.message || err?.message || "Delete failed"
        );
      },
    }
  );

  setRowSelection({});
}
  };
  const {
    data: { data = [], meta } = {},
    isError,
    isRefetching,
    isLoading,
  } = useQuery({
    queryKey: [
      queryKey,
      { columnFilters, globalFilter, pagination, sorting, deleteType },
    ],
    queryFn: async () => {
      // ✅ FIXED: fetchUrl is the api endpoint
      const url = new URL(fetchUrl, process.env.NEXT_PUBLIC_BASE_URL);

      url.searchParams.set(
        "start",
        `${pagination.pageIndex * pagination.pageSize}`
      );
      url.searchParams.set("size", `${pagination.pageSize}`);
      url.searchParams.set("filters", JSON.stringify(columnFilters ?? []));
      url.searchParams.set("globalFilter", globalFilter ?? "");
      url.searchParams.set("sorting", JSON.stringify(sorting ?? []));
      url.searchParams.set("deleteType", deleteType);

      const { data: response } = await axios.get(url.href);

      return response;
    },

    placeholderData: keepPreviousData,
  });

  const table = useMaterialReactTable({
    columns: columnsConfig,
    data,

    enableRowSelection: true,
    columnFilterDisplayMode: "popover",
    paginationDisplayMode: "pages",

    enableColumnOrdering: true,
    enableStickyHeader: true,
    enableStickyFooter: true,
    initialState: { showColumnFilters: true },

    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,

    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : undefined,

    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,

    rowCount: data?.meta?.totalRowCount ?? 0,
    onRowSelectionChange: setRowSelection,
  state: {
      columnFilters,
      globalFilter,
      isLoading,
      pagination,
      showAlertBanner: isError,
      showProgressBars: isRefetching,
      sorting,
      rowSelection,
    },

     getRowId: (originalRow) => originalRow._id,

    renderToolbarInternalActions: ({ table }) => (
      <>
        <MRT_ToggleGlobalFilterButton table={table} />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleFullScreenButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />

        {deleteType !== "PD" && (
          <Tooltip title="Recycle Bin">
            <Link href={trashView}>
              <IconButton>
                <RecyclingIcon />
              </IconButton>
            </Link>
          </Tooltip>
        )}

        {deleteType === "SD" && (
          <Tooltip title="Move to Trash">
            <IconButton
              disabled={
                !table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
              }
              onClick={() => handleDelete(Object.keys(rowSelection), "SD")}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}

        {deleteType === "PD" && (
          <>
            <Tooltip title="Restore">
              <IconButton
                disabled={
                  !table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
                }
                onClick={() => handleDelete(Object.keys(rowSelection), "RSD")}
              >
                <RestoreFromTrashIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Permanent Delete">
              <IconButton
                disabled={!table.getIsSomeRowsSelected()}
                onClick={() => handleDelete(Object.keys(rowSelection), "PD")}
              >
                <DeleteForeverIcon />
              </IconButton>
            </Tooltip>
          </>
        )}
      </>
    ),
                enableRowActions: true,
    positionActionsColumn: "last",

        renderRowActionMenuItems: ({ row }) =>
      createAction(row, deleteType, handleDelete),
renderTopToolbarCustomActions: ({ table }) => (
      <Tooltip title="Export CSV">
        <ButtonLoading
          type="button"
          text={
            <>
              <SaveAltIcon /> Export
            </>
          }
          loading={exportLoading}
          onClick={() => handleExport(table.getSelectedRowModel().rows)}
        />
      </Tooltip>
    ),
     
      })




    return (
    <div>
      <MaterialReactTable table={table} />
    </div>
  );
};

export default Datatable;