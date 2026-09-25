"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { ArrowUpDown, Boxes, Save, Search, SquarePen, Trash2, X } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { btn } from "@/components/ui/Application/Admin/listKit";

const card =
  "border border-[#e3e8ee] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] dark:border-border dark:bg-card";
const control =
  "h-[46px] w-full border bg-white px-[15px] text-[15px] text-[#1f2933] outline-none transition placeholder:text-[#8a939c] focus:border-[#188ae2] focus:shadow-[0_0_0_3px_rgba(24,138,226,0.15)] dark:bg-transparent dark:text-foreground";
const heading = "m-0 text-[20px] font-semibold text-[#1f2933] sm:text-[22px] dark:text-foreground";
const cell = "border border-[#edf0f3] px-[10px] py-[7px] text-[15px] dark:border-border";

/** Assets → Asset Type: create/edit on the left, the list on the right */
export default function AssetTypePage() {
  const [types, setTypes] = useState(null);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [term, setTerm] = useState("");
  const [perPage, setPerPage] = useState("10");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(["sl", 1]);
  const nameRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await axios.get("/api/asset-types");

      if (data.success) setTypes(data.data);
      else showToast("error", data.message || "Could not load asset types");
    } catch (err) {
      showToast("error", err.response?.data?.message || "Could not load asset types");
      setTypes([]);
    }
  };

  useEffect(() => {
    let cancelled = false;

    axios
      .get("/api/asset-types")
      .then(({ data }) => {
        if (!cancelled) setTypes(data.success ? data.data : []);
      })
      .catch(() => {
        if (!cancelled) setTypes([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    const list = (types || [])
      .map((row, index) => ({ ...row, sl: index + 1 }))
      .filter((row) => !needle || row.name.toLowerCase().includes(needle));
    const [key, dir] = sort;
    const get = key === "name" ? (row) => row.name.toLowerCase() : (row) => row.sl;

    return list.sort((a, b) => dir * (get(a) < get(b) ? -1 : get(a) > get(b) ? 1 : 0));
  }, [types, term, sort]);

  const size = perPage === "all" ? Math.max(rows.length, 1) : Number(perPage);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * size, current * size);

  const sortBy = (key) => setSort(([now, dir]) => [key, now === key ? -dir : 1]);

  const startEdit = (row) => {
    setEditing(row);
    setName(row.name);
    setError("");
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const reset = () => {
    setEditing(null);
    setName("");
    setError("");
  };

  const save = async (event) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Enter an asset type.");
      nameRef.current?.focus();
      return;
    }

    setSaving(true);

    try {
      const { data } = editing
        ? await axios.put(`/api/asset-types/${editing._id}`, { name })
        : await axios.post("/api/asset-types", { name });

      if (!data.success) {
        setError(data.message);
        return;
      }

      showToast("success", data.message);
      reset();
      load();
      nameRef.current?.focus();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save asset type");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!confirm(`Delete "${row.name}"?`)) return;

    try {
      const { data } = await axios.delete(`/api/asset-types/${row._id}`);

      showToast(data.success ? "success" : "error", data.message);

      if (data.success) {
        if (editing?._id === row._id) reset();
        load();
      }
    } catch (err) {
      showToast("error", err.response?.data?.message || "Could not delete asset type");
    }
  };

  return (
    <div className="grid grid-cols-1 items-start gap-[16px] lg:grid-cols-[minmax(320px,1fr)_2fr] lg:gap-[24px]">
      <form onSubmit={save} noValidate className={`${card} px-[16px] py-[20px] sm:px-[25px] sm:py-[28px] lg:sticky lg:top-[84px]`}>
        <div className="mb-[22px] flex items-center justify-between gap-3">
          <h1 className={heading}>{editing ? "Update Asset Type" : "Create Asset Type"}</h1>
          {editing && (
            <button type="button" onClick={reset} className="flex items-center gap-[4px] text-[13px] text-[#6b7785] hover:text-[#1f2933]">
              <X size={14} /> Cancel edit
            </button>
          )}
        </div>

        <label htmlFor="at-name" className="mb-[10px] block text-[16px] font-medium">
          Asset Type <span className="text-[#f05252]">*</span>
        </label>
        <input
          id="at-name"
          ref={nameRef}
          value={name}
          maxLength={150}
          autoComplete="off"
          placeholder="Asset Type, e.g. Furniture"
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
          aria-invalid={Boolean(error)}
          className={`${control} ${error ? "border-[#ff5b5b]" : "border-[#dfe3e8] hover:border-[#c5ccd3] dark:border-input"}`}
        />
        {error && (
          <p role="alert" className="m-0 mt-[6px] text-[13px] text-[#e5484d]">
            {error}
          </p>
        )}

        <div className="mt-[28px] flex gap-[8px] sm:justify-end">
          {editing && (
            <button type="button" onClick={reset} className={btn.secondary}>
              Cancel
            </button>
          )}
          <button type="submit" disabled={saving} className={`${btn.info} !px-[18px]`}>
            <Save size={15} /> {saving ? "Saving…" : editing ? "Update" : "Save"}
          </button>
        </div>
      </form>

      <section className={`${card} border-t-[3px] border-t-[#00801a] px-[16px] py-[18px] sm:px-[25px] sm:py-[22px] dark:border-t-[#00801a]`}>
        <h2 className={heading}>Asset Type List</h2>

        <div className="mt-[16px] flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-[8px] text-[15px] text-[#3b4652] dark:text-foreground">
            Show
            <select
              value={perPage}
              onChange={(event) => {
                setPerPage(event.target.value);
                setPage(1);
              }}
              aria-label="Rows per page"
              className="h-[36px] w-[92px] border border-[#dfe3e8] bg-white px-[8px] text-[14px] outline-none dark:border-input dark:bg-transparent"
            >
              {["10", "25", "50", "all"].map((n) => (
                <option key={n} value={n}>
                  {n === "all" ? "All" : n}
                </option>
              ))}
            </select>
            entries
          </label>

          <label className="relative block sm:w-[250px]">
            <Search size={15} className="pointer-events-none absolute left-[12px] top-1/2 -translate-y-1/2 text-[#8a939c]" />
            <input
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Search"
              aria-label="Search asset types"
              className="h-[40px] w-full border border-[#dfe3e8] bg-white pl-[34px] pr-[12px] text-[14px] outline-none transition focus:border-[#188ae2] focus:shadow-[0_0_0_3px_rgba(24,138,226,0.15)] dark:border-input dark:bg-transparent"
            />
          </label>
        </div>

        <div className="mt-[16px] overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-[#00801a] text-white">
              <tr>
                {[
                  ["sl", "SL", "w-[12%]"],
                  ["name", "Asset Type", ""],
                ].map(([key, head, width]) => (
                  <th key={key} className={`${width} border border-[#0a7a1f] px-[10px] py-[10px] text-[15.5px] font-bold`}>
                    <button type="button" onClick={() => sortBy(key)} aria-label={`Sort by ${head}`} className="flex w-full items-center justify-between gap-2">
                      {head}
                      <ArrowUpDown size={13} className={sort[0] === key ? "opacity-100" : "opacity-50"} />
                    </button>
                  </th>
                ))}
                <th className="w-[190px] border border-[#0a7a1f] px-[10px] py-[10px] text-[15.5px] font-bold">Action</th>
              </tr>
            </thead>

            <tbody>
              {!types &&
                [1, 2, 3].map((n) => (
                  <tr key={n}>
                    <td colSpan={3} className={cell}>
                      <div className="h-5 animate-pulse bg-slate-100 dark:bg-muted" />
                    </td>
                  </tr>
                ))}

              {types && shown.length === 0 && (
                <tr>
                  <td colSpan={3} className={cell}>
                    <div className="flex flex-col items-center gap-[6px] py-[26px] text-center">
                      <Boxes size={26} className="text-[#b5c0ca]" aria-hidden="true" />
                      <p className="m-0 text-[15px]">
                        {term ? `No asset type matches “${term}”` : "No data available in table"}
                      </p>
                      {!term && <p className="m-0 text-[13px] text-[#8a939c]">Add your first asset type with the form.</p>}
                    </div>
                  </td>
                </tr>
              )}

              {shown.map((row) => (
                <tr
                  key={row._id}
                  className={editing?._id === row._id ? "bg-[#f2fbfe] dark:bg-muted" : "hover:bg-[#f6f9fc] dark:hover:bg-muted/50"}
                >
                  <td className={`${cell} tabular-nums`}>{row.sl}</td>
                  <td className={cell}>{row.name}</td>
                  <td className={cell}>
                    <div className="inline-flex">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="inline-flex items-center gap-[5px] bg-[#10c469] px-[12px] py-[6px] text-[13px] text-white hover:bg-[#0dab5b]"
                      >
                        <SquarePen size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(row)}
                        className="inline-flex items-center gap-[5px] bg-[#ff5b5b] px-[12px] py-[6px] text-[13px] text-white hover:bg-[#f24242]"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-[18px] flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 text-[15px] text-[#3b4652] dark:text-foreground">
            Showing {rows.length ? (current - 1) * size + 1 : 0} to {Math.min(current * size, rows.length)} of {rows.length} entries
          </p>

          <nav className="flex self-start border border-[#dee2e6] text-[15px] sm:self-auto dark:border-border" aria-label="Pagination">
            <button
              type="button"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
              className="px-[14px] py-[8px] text-[#6c757d] hover:bg-[#f1f3f5] disabled:opacity-50"
            >
              Previous
            </button>
            {Array.from({ length: pages }, (_, index) => index + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                aria-current={n === current ? "page" : undefined}
                className={`min-w-[38px] border-l border-[#dee2e6] px-[12px] py-[8px] dark:border-border ${
                  n === current ? "bg-[#188ae2] text-white" : "text-[#188ae2] hover:bg-[#f1f3f5]"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={current >= pages}
              onClick={() => setPage(current + 1)}
              className="border-l border-[#dee2e6] px-[14px] py-[8px] text-[#6c757d] hover:bg-[#f1f3f5] disabled:opacity-50 dark:border-border"
            >
              Next
            </button>
          </nav>
        </div>
      </section>
    </div>
  );
}
