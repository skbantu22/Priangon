"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Field, control } from "@/components/ui/Application/Admin/settings/settingsKit";
import { showToast } from "@/lib/showToast";

const empty = { name: "", phone: "", email: "", website: "", address: "", logo: "", isActive: true };

export default function BranchesPanel() {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState(null);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [logoFile, setLogoFile] = useState(null);

  const load = () => {
    axios
      .get("/api/showrooms")
      .then(({ data }) => {
        if (!data.success) return;
        const list = [...(data.showrooms || [])].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        setRows(list);
      })
      .catch(() => showToast("error", "Could not load branches"));
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows || [];
    if (!q) return list;
    return list.filter((row) =>
      [row.name, row.phone, row.address].some((value) => String(value || "").toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize) || 1);
  const safePage = Math.min(page, pageCount);
  const slice = visible.slice((safePage - 1) * pageSize, safePage * pageSize);
  const from = visible.length ? (safePage - 1) * pageSize + 1 : 0;
  const to = Math.min(safePage * pageSize, visible.length);

  const openNew = () => {
    setEditor("new");
    setForm(empty);
    setLogoFile(null);
    setNameError("");
    setPhoneError("");
    setAddressError("");
  };

  const openEdit = (row) => {
    setEditor(row._id);
    setLogoFile(null);
    setForm({
      name: row.name || "",
      phone: row.phone || "",
      email: row.email || "",
      website: row.website || "",
      address: row.address || "",
      logo: row.logo || "",
      isActive: row.isActive !== false,
    });
    setNameError("");
    setPhoneError("");
    setAddressError("");
  };

  const close = () => {
    setEditor(null);
    setForm(empty);
    setLogoFile(null);
    setNameError("");
    setPhoneError("");
    setAddressError("");
  };

  const refreshPos = () => queryClient.invalidateQueries({ queryKey: ["pos-showrooms"] });

  const save = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();
    setNameError(name ? "" : "Name is required");
    setPhoneError(phone ? "" : "Mobile is required");
    setAddressError(address ? "" : "Address is required");
    if (!name || !phone || !address) return;
    setSaving(true);
    try {
      let logo = form.logo.trim();
      if (logoFile) {
        const body = new FormData();
        body.append("file", logoFile);
        const uploaded = await axios.post("/api/media/upload", body, { headers: { "Content-Type": "multipart/form-data" } });
        if (!uploaded.data?.success) throw new Error(uploaded.data?.message || "Could not upload the logo");
        logo = uploaded.data.media?.secure_url || uploaded.data.media?.url || logo;
      }
      const payload = {
        name,
        phone,
        email: form.email.trim(),
        website: form.website.trim(),
        address,
        logo,
        isActive: form.isActive,
      };
      const request = editor === "new" ? axios.post("/api/showrooms", payload) : axios.patch(`/api/showrooms/${editor}`, payload);
      const { data } = await request;
      if (!data.success) throw new Error(data.message);
      const moved = Number(data.moved) || 0;
      showToast(
        "success",
        editor === "new"
          ? moved
            ? `${name} added. ${moved} item${moved === 1 ? "" : "s"} moved onto this shelf. Refresh the POS.`
            : `${name} added. Refresh the POS.`
          : `${name} updated`,
      );
      close();
      refreshPos();
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Could not save the branch");
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (row, isActive) => {
    try {
      const { data } = await axios.patch(`/api/showrooms/${row._id}`, { isActive });
      if (!data.success) throw new Error(data.message);
      showToast("success", isActive ? `${row.name} is active` : `${row.name} is disabled`);
      refreshPos();
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Could not update the branch");
    }
  };

  return (
    <div className="rounded-sm border border-[#d7dee6] bg-white dark:border-border dark:bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6ebf1] px-4 py-3 dark:border-border">
        <h2 className="text-[18px] font-semibold text-[#1f2933] dark:text-foreground">Branches</h2>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex h-8 items-center gap-1 rounded-sm bg-[#188ae2] px-3 text-[12.5px] font-semibold text-white hover:bg-[#1479c9]"
        >
          <Plus size={14} />
          Add New Business Branches
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13px] text-[#3b4652] dark:text-foreground">
        <label className="flex items-center gap-2">
          Show
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-8 border border-[#dfe3e8] bg-white px-2 dark:border-border dark:bg-card"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          entries
        </label>
        <label className="flex items-center gap-2">
          Search:
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="h-8 w-[180px] border border-[#dfe3e8] bg-white px-2 outline-none focus:border-[#188ae2] dark:border-border dark:bg-card"
          />
        </label>
      </div>

      <div className="overflow-x-auto px-4">
        <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="bg-[#1aa34a] text-white">
              {["SL", "Business", "Logo", "Start Date", "Mobile", "Address", "Account Status", "Action"].map((label) => (
                <th key={label} className="border border-[#179243] px-3 py-2 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows === null && (
              <tr>
                <td colSpan={8} className="border border-[#e6ebf1] px-3 py-8 text-center text-[#6b7785]">
                  Loading branches…
                </td>
              </tr>
            )}
            {rows && slice.length === 0 && (
              <tr>
                <td colSpan={8} className="border border-[#e6ebf1] px-3 py-8 text-center text-[#6b7785]">
                  No branch yet. Use Add New Business Branch, then refresh the POS.
                </td>
              </tr>
            )}
            {slice.map((row, index) => {
              const active = row.isActive !== false;
              return (
                <tr key={row._id} className="odd:bg-white even:bg-[#f7faf8] dark:odd:bg-card dark:even:bg-white/5">
                  <td className="border border-[#e6ebf1] px-3 py-2 dark:border-border">{from + index}</td>
                  <td className="border border-[#e6ebf1] px-3 py-2 font-medium dark:border-border">{row.name}</td>
                  <td className="border border-[#e6ebf1] px-3 py-2 dark:border-border">
                    {row.logo ? (
                      // a shop logo link, same as the invoice logo preview
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.logo} alt="" className="h-8 max-w-[72px] object-contain" />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border border-[#e6ebf1] px-3 py-2 dark:border-border">
                    {row.createdAt ? String(row.createdAt).slice(0, 10) : ""}
                  </td>
                  <td className="border border-[#e6ebf1] px-3 py-2 dark:border-border">{row.phone || "—"}</td>
                  <td className="border border-[#e6ebf1] px-3 py-2 dark:border-border">{row.address || "—"}</td>
                  <td className="border border-[#e6ebf1] px-3 py-2 dark:border-border">
                    <span className={`font-semibold ${active ? "text-[#1aa34a]" : "text-[#98a6ad]"}`}>
                      {active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="border border-[#e6ebf1] px-3 py-2 dark:border-border">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="rounded-sm bg-[#188ae2] px-2 py-1 text-[12px] font-semibold text-white hover:bg-[#1479c9]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setActive(row, !active)}
                        className={`rounded-sm px-2 py-1 text-[12px] font-semibold text-white ${active ? "bg-[#f05252] hover:bg-[#de3d3d]" : "bg-[#1aa34a] hover:bg-[#178f40]"}`}
                      >
                        {active ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[12.5px] text-[#6b7785]">
        <span>
          Showing {from} to {to} of {visible.length} entries
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
            className="h-8 border border-[#dfe3e8] bg-white px-3 text-[#3b4652] disabled:opacity-40 dark:border-border dark:bg-card dark:text-foreground"
          >
            Previous
          </button>
          <span className="flex h-8 min-w-8 items-center justify-center bg-[#1aa34a] px-2 font-semibold text-white">{safePage}</span>
          <button
            type="button"
            disabled={safePage >= pageCount}
            onClick={() => setPage(safePage + 1)}
            className="h-8 border border-[#dfe3e8] bg-white px-3 text-[#3b4652] disabled:opacity-40 dark:border-border dark:bg-card dark:text-foreground"
          >
            Next
          </button>
        </div>
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
          <form noValidate onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-sm bg-white p-5 shadow-xl dark:bg-card">
            <h2 className="text-[18px] font-semibold text-[#1f2933] dark:text-foreground">
              {editor === "new" ? "Add New Business Branch" : "Edit Business Branch"}
            </h2>
            <div className="mt-4 grid gap-3">
              <Field id="branch-name" label="Name" required error={nameError}>
                <input
                  id="branch-name"
                  value={form.name}
                  maxLength={80}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={control(nameError)}
                  placeholder="Name"
                />
              </Field>
              <Field id="branch-phone" label="Mobile" required error={phoneError}>
                <input
                  id="branch-phone"
                  value={form.phone}
                  inputMode="tel"
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={control(phoneError)}
                  placeholder="Mobile"
                />
              </Field>
              <Field id="branch-email" label="Email">
                <input
                  id="branch-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={control(false)}
                  placeholder="Email"
                />
              </Field>
              <Field id="branch-website" label="Website">
                <input
                  id="branch-website"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className={control(false)}
                  placeholder="Website"
                />
              </Field>
              <Field id="branch-logo" label="Logo">
                <input
                  id="branch-logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="block w-full text-[13px]"
                />
                {form.logo && !logoFile && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logo} alt="" className="mt-2 h-10 object-contain" />
                )}
              </Field>
              <label className="flex items-center gap-2 text-[14px] text-[#1f2933] dark:text-foreground">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="size-4 accent-[#188ae2]"
                />
                Is Active
              </label>
              <Field id="branch-address" label="Address" required error={addressError}>
                <input
                  id="branch-address"
                  value={form.address}
                  maxLength={200}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={control(addressError)}
                  placeholder="Address"
                />
              </Field>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="h-9 bg-[#188ae2] px-5 text-[13px] font-semibold text-white hover:bg-[#1479c9] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
