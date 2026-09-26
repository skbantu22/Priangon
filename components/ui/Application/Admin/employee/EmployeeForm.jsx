"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ImagePlus, List, Save, Trash2 } from "lucide-react";

import { showToast } from "@/lib/showToast";
import { ADMIN_EMPLOYEES } from "@/Route/Adminpannelroute";
import { ListCard, btn, filterInput as inputClass } from "@/components/ui/Application/Admin/listKit";
import { Field, today, toInputDate } from "@/components/ui/Application/Admin/purchase/purchaseKit";

const EMPTY = { name: "", designation: "", showroomId: "", email: "", mobile: "", nid: "", address: "", joiningDate: today(), salary: "", picture: null };

/** Employees → Add New Employee (and Edit), like 360's form; the picture is optional */
export default function EmployeeForm({ id }) {
  const router = useRouter();
  const editing = Boolean(id);
  const [form, setForm] = useState(EMPTY);
  const [branches, setBranches] = useState([]);
  const [loaded, setLoaded] = useState(!editing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    axios
      .get("/api/showrooms")
      .then(({ data }) => data.success && setBranches(data.showrooms || []))
      .catch(() => {});

    if (!editing) return;
    axios
      .get(`/api/employees/${id}`)
      .then(({ data }) => {
        if (!data.success) return showToast("error", data.message || "Employee not found");
        const e = data.data;
        setForm({
          name: e.name,
          designation: e.designation,
          showroomId: e.showroomId ? String(e.showroomId) : "",
          email: e.email || "",
          mobile: e.mobile,
          nid: e.nid || "",
          address: e.address || "",
          joiningDate: toInputDate(e.joiningDate),
          salary: String(e.salary ?? ""),
          picture: e.picture?.url ? e.picture : null,
        });
        setLoaded(true);
      })
      .catch((err) => showToast("error", err.response?.data?.message || "Could not load the employee"));
  }, [editing, id]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const choosePicture = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return showToast("error", "Choose an image file (JPG or PNG)");
    if (file.size > 2 * 1024 * 1024) return showToast("error", "The picture must be 2 MB or smaller");

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const { data } = await axios.post("/api/employees/picture", body);
      if (!data.success) return showToast("error", data.message || "Upload failed");
      setForm((f) => ({ ...f, picture: data.data }));
    } catch (err) {
      showToast("error", err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return showToast("error", "Enter the employee name");
    if (!form.designation.trim()) return showToast("error", "Enter the designation");
    if (!form.mobile.trim()) return showToast("error", "Enter the mobile number");

    setSaving(true);
    try {
      const body = { ...form, salary: Number(form.salary) || 0, picture: form.picture || { url: "", publicId: "" } };
      const { data } = editing ? await axios.put(`/api/employees/${id}`, body) : await axios.post("/api/employees", body);
      if (!data.success) return showToast("error", data.message || "Could not save");
      showToast("success", data.message);
      router.push(ADMIN_EMPLOYEES);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="h-[420px] animate-pulse rounded-[8px] bg-white dark:bg-card" />;

  return (
    <form onSubmit={save} noValidate>
      <ListCard
        title={editing ? "Edit Employee" : "Add New Employee"}
        actions={
          <Link href={ADMIN_EMPLOYEES} className={btn.secondary}>
            <List size={14} /> Employee List
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-x-[22px] gap-y-[16px] md:grid-cols-2">
          <Field label="Employee Name" required htmlFor="em-name">
            <input id="em-name" value={form.name} onChange={set("name")} placeholder="Employee Name" maxLength={255} className={inputClass} autoFocus />
          </Field>
          <Field label="Designation" required htmlFor="em-designation">
            <input id="em-designation" value={form.designation} onChange={set("designation")} placeholder="e.g. Salesman, Cashier" maxLength={120} className={inputClass} />
          </Field>
          <Field label="Business Branch" htmlFor="em-branch">
            <select id="em-branch" value={form.showroomId} onChange={set("showroomId")} className={inputClass}>
              <option value="">Head Office</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Email" htmlFor="em-email">
            <input id="em-email" type="email" value={form.email} onChange={set("email")} placeholder="Email" className={inputClass} />
          </Field>
          <Field label="Mobile" required htmlFor="em-mobile">
            <input id="em-mobile" type="tel" value={form.mobile} onChange={set("mobile")} placeholder="01XXXXXXXXX" maxLength={30} className={inputClass} />
          </Field>
          <Field label="NID Number" htmlFor="em-nid">
            <input id="em-nid" value={form.nid} onChange={set("nid")} placeholder="NID Number" maxLength={40} className={inputClass} />
          </Field>
          <Field label="Picture" htmlFor="em-picture">
            <div className="flex items-center gap-3">
              {form.picture?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.picture.url} alt="" className="size-[46px] rounded-full object-cover" />
              ) : (
                <span className="flex size-[46px] items-center justify-center rounded-full bg-[#eef1f4] text-[#98a6ad]">
                  <ImagePlus size={18} />
                </span>
              )}
              <label className={`${btn.info} cursor-pointer`}>
                <ImagePlus size={14} /> {uploading ? "Uploading…" : form.picture?.url ? "Change" : "Choose"}
                <input id="em-picture" type="file" accept="image/*" onChange={choosePicture} disabled={uploading} className="hidden" />
              </label>
              {form.picture?.url && (
                <button type="button" onClick={() => setForm((f) => ({ ...f, picture: null }))} className={btn.danger} aria-label="Remove picture">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </Field>
          <Field label="Address" htmlFor="em-address">
            <input id="em-address" value={form.address} onChange={set("address")} placeholder="Address" maxLength={500} className={inputClass} />
          </Field>
          <Field label="Joining Date" required htmlFor="em-joining">
            <input id="em-joining" type="date" max={today()} value={form.joiningDate} onChange={set("joiningDate")} className={inputClass} />
          </Field>
          <Field label="Salary (monthly)" htmlFor="em-salary">
            <input id="em-salary" type="number" min="0" step="0.01" value={form.salary} onChange={set("salary")} placeholder="0.00" className={inputClass} />
          </Field>
        </div>

        <div className="mt-[18px] flex justify-end gap-2">
          <button type="button" onClick={() => router.push(ADMIN_EMPLOYEES)} className={btn.secondary}>
            Cancel
          </button>
          <button type="submit" disabled={saving || uploading} className={btn.success}>
            <Save size={14} /> {saving ? "Saving…" : editing ? "Update" : "Save"}
          </button>
        </div>
      </ListCard>
    </form>
  );
}
