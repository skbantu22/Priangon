"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Pencil, Percent, PlusSquare, Save, Trash2, X } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { control, labelClass } from "@/components/ui/Application/Admin/settings/settingsKit";

const EMPTY = { name: "", percent: "" };
const pct = (v) => String(Number(v || 0));

/**
 * Settings → VAT Settings: the VAT / SD groups a product can be put in,
 * like the 360 list. The POS adds a product's group percent on top of its
 * price.
 */
export default function VatGroupsPanel() {
  const [groups, setGroups] = useState(null);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState(null); // null closed, {} new, a group to edit
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/vat-groups")
      .then(({ data }) => !cancelled && setGroups(data?.data || []))
      .catch(() => !cancelled && setGroups([]));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const open = (group) => {
    setEditing(group || {});
    setForm(group ? { name: group.name, percent: pct(group.percent) } : EMPTY);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = editing._id
        ? await axios.put(`/api/vat-groups/${editing._id}`, form)
        : await axios.post("/api/vat-groups", form);
      if (!data?.success) throw new Error(data?.message);
      showToast("success", data.message);
      setEditing(null);
      setVersion((v) => v + 1);
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (group) => {
    if (!confirm(`Delete "${group.name}"? Products in this group will be left without VAT.`)) return;
    try {
      const { data } = await axios.delete(`/api/vat-groups/${group._id}`);
      showToast(data?.success ? "success" : "error", data?.message);
      setVersion((v) => v + 1);
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not delete");
    }
  };

  return (
    <section className="border border-[#e3e8ee] border-t-[3px] border-t-[#00801a] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] dark:border-border dark:bg-card">
      <header className="flex flex-col gap-3 px-4 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-[22px]">
        <div>
          <h2 className="text-[20px] font-semibold text-[#1f2933] dark:text-foreground">VAT / SD Groups</h2>
          <p className="mt-1 text-[13px] text-[#6b7785]">
            Pick one on Add Product. The POS adds the group&apos;s percentage on top of that product&apos;s price.
          </p>
        </div>
        <button
          type="button"
          onClick={() => open(null)}
          className="flex h-[40px] items-center justify-center gap-2 bg-[#188ae2] px-4 text-[14px] font-medium text-white hover:bg-[#1379c7]"
        >
          <PlusSquare size={16} /> Add VAT Group
        </button>
      </header>

      <div className="px-4 pb-5 pt-4 sm:px-[22px]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-[#00801a] text-white">
              <tr className="[&>th]:border [&>th]:border-[#0a7a1f] [&>th]:px-[10px] [&>th]:py-[9px] [&>th]:text-[14.5px] [&>th]:font-bold">
                <th className="w-[10%]">SL</th>
                <th>VAT/SD Group Name</th>
                <th className="w-[25%]">Percentage (%)</th>
                <th className="w-[180px]">Action</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:border [&>tr>td]:border-[#edf0f3] [&>tr>td]:px-[10px] [&>tr>td]:py-[6px] [&>tr>td]:text-[14.5px] dark:[&>tr>td]:border-border">
              {groups === null && (
                <tr>
                  <td colSpan={4}>
                    <div className="h-5 animate-pulse bg-slate-100 dark:bg-white/5" />
                  </td>
                </tr>
              )}
              {groups?.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#6b7785]">
                    <Percent size={22} className="mx-auto mb-1 text-[#b5c0ca]" />
                    No VAT group yet. Add one, e.g. &quot;Standard VAT&quot; 15%.
                  </td>
                </tr>
              )}
              {groups?.map((g, i) => (
                <tr key={g._id} className="hover:bg-[#f6f9fc] dark:hover:bg-white/5">
                  <td className="tabular-nums">{i + 1}</td>
                  <td>{g.name}</td>
                  <td className="tabular-nums">{pct(g.percent)}</td>
                  <td>
                    <div className="inline-flex">
                      <button
                        type="button"
                        onClick={() => open(g)}
                        className="flex h-[30px] items-center gap-1 bg-[#188ae2] px-2.5 text-[13px] text-white hover:bg-[#1379c7]"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(g)}
                        className="flex h-[30px] items-center gap-1 bg-[#ff5b5b] px-2.5 text-[13px] text-white hover:bg-[#e04848]"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-start sm:p-4 sm:pt-[10vh]"
          onMouseDown={(e) => e.target === e.currentTarget && setEditing(null)}
        >
          <form
            onSubmit={save}
            noValidate
            role="dialog"
            aria-modal="true"
            aria-labelledby="vat-group-title"
            className="flex w-full max-w-[480px] flex-col bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)] dark:bg-card"
          >
            <div className="flex items-center justify-between border-b border-[#eef1f4] bg-[#fafbfc] px-[18px] py-[14px] dark:border-border dark:bg-white/5">
              <h3 id="vat-group-title" className="text-[17px] font-semibold">
                {editing._id ? "Update VAT Group" : "Add VAT Group"}
              </h3>
              <button type="button" onClick={() => setEditing(null)} className="p-1 text-[#6b7785] hover:bg-[#f1f3f5]" aria-label="Close">
                <X size={19} />
              </button>
            </div>
            <div className="space-y-4 px-[18px] py-[18px]">
              <div>
                <label htmlFor="vg-name" className={labelClass}>
                  VAT/SD Group Name <span className="text-[#f05252]">*</span>
                </label>
                <input
                  id="vg-name"
                  autoFocus
                  value={form.name}
                  maxLength={100}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Standard VAT"
                  className={control(false)}
                />
              </div>
              <div>
                <label htmlFor="vg-percent" className={labelClass}>
                  Percentage (%) <span className="text-[#f05252]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="vg-percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    inputMode="decimal"
                    value={form.percent}
                    onChange={(e) => setForm({ ...form, percent: e.target.value })}
                    placeholder="15"
                    className={`${control(false)} pr-[38px] tabular-nums`}
                  />
                  <span className="pointer-events-none absolute right-[13px] top-1/2 -translate-y-1/2 text-[#6b7785]">%</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 border-t border-[#eef1f4] bg-[#fafbfc] px-[18px] py-[12px] sm:justify-end dark:border-border dark:bg-white/5">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="h-[40px] flex-1 border border-[#dfe3e8] bg-white px-4 text-[14px] sm:flex-none dark:border-border dark:bg-card"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex h-[40px] flex-1 items-center justify-center gap-2 bg-[#10c469] px-5 text-[14px] font-semibold text-white hover:bg-[#0eab5c] disabled:opacity-50 sm:flex-none"
              >
                <Save size={16} /> {saving ? "Saving…" : editing._id ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
