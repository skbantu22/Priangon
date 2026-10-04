"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Hash,
  ImageIcon,
  List,
  Loader2,
  Mail,
  Map as MapIcon,
  MapPin,
  Paperclip,
  Pencil,
  Search,
  User,
  UserPlus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CUSTOMER_TYPES, normalizeCustomerType } from "@/lib/priceTiers";
import { showToast } from "@/lib/showToast";
import { useOpeningStockTill } from "@/lib/posProducts";

const isPhone = (s) => /^01\d{9}$/.test(String(s).replace(/[\s-]/g, ""));

const EMPTY_FORM = {
  name: "",
  businessName: "",
  phone: "",
  email: "",
  area: "",
  address: "",
  type: "retail",
  password: "",
  openingDue: "",
  openingDate: "",
  photo: "",
  attachment: "",
  membershipNumber: "",
  note: "",
};

const inputClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary dark:border-white/10 dark:bg-transparent";

// bare control that sits inside an IconBox
const bareClass = "h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none";

const TypeBadge = ({ type }) => {
  const t = normalizeCustomerType(type);
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        t === "retail" ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {CUSTOMER_TYPES[t].short}
    </span>
  );
};

// label + a field with a grey icon cell on the left (one column on a phone, two from sm up)
const Field = ({ label, required, className = "", children }) => (
  <div className={`min-w-0 space-y-1 ${className}`}>
    <span className="text-sm font-medium">
      {label}
      {required && <span className="text-red-500">*</span>}
    </span>
    {children}
  </div>
);

const IconBox = ({ icon: Icon, text, children }) => (
  <div className="flex min-w-0 overflow-hidden rounded-lg border border-gray-200 focus-within:border-primary dark:border-white/10">
    <span className="flex min-w-10 shrink-0 items-center justify-center bg-muted px-2 text-sm font-semibold text-muted-foreground">
      {Icon ? <Icon className="size-4" /> : text}
    </span>
    {children}
  </div>
);

// POS customer modal: find a customer, or add / edit one with its type.
// The picked customer's type sets the rate the cart charges (dealer price...).
export default function CustomerModal({ open, onOpenChange, onPick, initialQuery = "" }) {
  const till = useOpeningStockTill();
  const [tab, setTab] = useState("find");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [attachFile, setAttachFile] = useState(null);
  const photoInputRef = useRef(null);
  const attachInputRef = useRef(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // every open starts on "find", seeded with what was typed in the cart box
  useEffect(() => {
    if (!open) return;
    setTab("find");
    setQuery(initialQuery);
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setAttachFile(null);
  }, [open, initialQuery]);

  useEffect(() => {
    if (!photoFile?.preview) return undefined;
    return () => URL.revokeObjectURL(photoFile.preview);
  }, [photoFile]);

  useEffect(() => {
    if (!open || tab !== "find") return;
    const q = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const url = q.length >= 2 ? `/api/customer/search?q=${encodeURIComponent(q)}` : "/api/customer/search?recent=1";
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        setResults(data.customers || []);
      } catch {
        // aborted or offline: keep the old list
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, tab, query]);

  const pick = (c) => {
    onPick(c);
    onOpenChange(false);
    const type = normalizeCustomerType(c.type);
    if (type !== "retail") showToast("success", `${CUSTOMER_TYPES[type].short} rate applied`);
  };

  const startNew = () => {
    const q = query.trim();
    setForm({ ...EMPTY_FORM, ...(isPhone(q) ? { phone: q } : { name: q }) });
    setPhotoFile(null);
    setAttachFile(null);
    setTab("form");
  };

  const startEdit = (c) => {
    const type = normalizeCustomerType(c.type);
    // a dealer / wholesaler already has a login: the password is only for changing it
    setForm({
      ...EMPTY_FORM,
      name: c.name || "",
      businessName: c.businessName || "",
      phone: c.phone || "",
      email: c.email || "",
      area: c.area || "",
      address: c.address || "",
      photo: c.photo || "",
      attachment: c.attachment || "",
      membershipNumber: c.membershipNumber || "",
      note: c.note || "",
      type,
      hadLogin: type !== "retail",
      existing: true,
    });
    setPhotoFile(null);
    setAttachFile(null);
    setTab("form");
  };

  const save = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return showToast("error", "Enter the customer's name");
    if (!isPhone(form.phone)) return showToast("error", "Phone must be 01XXXXXXXXX");
    // a dealer, sub dealer or wholesaler gets a login; a buyer needs no password
    const partner = normalizeCustomerType(form.type) !== "retail";
    if (partner && !form.hadLogin && form.password.trim().length < 4) {
      return showToast("error", "Set a password of at least 4 characters for their login");
    }
    if (form.password && form.password.trim().length < 4) {
      return showToast("error", "The password needs at least 4 characters");
    }

    setSaving(true);
    const uploadedIds = [];
    const dropUploads = () => {
      uploadedIds.forEach((id) => {
        fetch("/api/media/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [id], deleteType: "PD" }),
        }).catch(() => {});
      });
    };
    const upload = async (file, what) => {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/media/upload", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!data?.success || !data.media?.secure_url) {
        throw new Error(data?.message || `Could not upload the ${what}`);
      }
      uploadedIds.push(data.media._id);
      return data.media.secure_url;
    };

    try {
      const payload = { ...form, showroomId: till.id };
      if (photoFile?.file) payload.photo = await upload(photoFile.file, "picture");
      if (attachFile?.file) payload.attachment = await upload(attachFile.file, "attachment");

      const res = await fetch("/api/customer/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast("success", data.message);
      pick(data.customer);
    } catch (err) {
      dropUploads();
      showToast("error", err.message || "Could not save customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-3 overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{tab === "form" ? "Create new customer" : "Customer"}</DialogTitle>
          <DialogDescription>
            Dealer, sub dealer and wholesaler customers get their own rate in the cart.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
          {[
            { key: "find", label: "Find customer", icon: Search },
            { key: "form", label: form.phone && tab === "form" ? "Customer details" : "Add new", icon: UserPlus },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => (key === "form" && tab !== "form" ? startNew() : setTab(key))}
              className={`flex h-8 items-center justify-center gap-1.5 rounded-md font-medium ${
                tab === key ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "find" ? (
          <div className="space-y-2">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 focus-within:border-primary dark:border-white/10">
              <Search className="size-4 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or phone number"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              {searching && <Loader2 className="size-4 animate-spin text-gray-400" />}
            </label>

            <p className="text-[11px] text-muted-foreground">
              {query.trim().length >= 2 ? `${results.length} found` : "Recent customers"}
            </p>

            <div className="max-h-72 divide-y overflow-y-auto rounded-lg border">
              {results.length === 0 && !searching && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">No customer found</p>
              )}
              {results.map((c) => (
                <div key={c._id} className="flex items-center gap-2 px-3 py-2 hover:bg-primary/5">
                  {c.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.photo} alt="" className="size-9 shrink-0 rounded-full border object-cover" />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
                      {String(c.name || "?").slice(0, 2)}
                    </span>
                  )}
                  <button type="button" onClick={() => pick(c)} className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{c.name}</span>
                      <TypeBadge type={c.type} />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.phone} · {c.totalOrders || 0} orders
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    title="Edit / change type"
                    className="flex size-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-primary dark:hover:bg-white/10"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => pick(c)}
                    className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={startNew}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/50 text-sm font-medium text-primary hover:bg-primary/5"
            >
              <UserPlus className="size-4" />
              {query.trim() ? `Add “${query.trim()}” as new customer` : "Add new customer"}
            </button>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <Field label="Name" required>
                <IconBox icon={User}>
                  <input autoFocus value={form.name} onChange={set("name")} placeholder="Name" className={bareClass} />
                </IconBox>
              </Field>
              <Field label="Business Name">
                <IconBox icon={User}>
                  <input value={form.businessName} onChange={set("businessName")} placeholder="Business Name" className={bareClass} />
                </IconBox>
              </Field>

              <Field label="Customer Group (sets the price)">
                <IconBox icon={List}>
                  <select value={form.type} onChange={set("type")} className={bareClass}>
                    {Object.entries(CUSTOMER_TYPES).map(([key, t]) => (
                      <option key={key} value={key}>{t.label}</option>
                    ))}
                  </select>
                </IconBox>
              </Field>
              <Field label="Email">
                <IconBox icon={Mail}>
                  <input type="email" value={form.email} onChange={set("email")} placeholder="Email" className={bareClass} />
                </IconBox>
              </Field>

              <Field label="Mobile" required>
                <IconBox text="+88">
                  <input value={form.phone} onChange={set("phone")} placeholder="01XXXXXXXXX" inputMode="tel" className={bareClass} />
                </IconBox>
              </Field>
              <Field label="Area">
                <IconBox icon={MapPin}>
                  <input value={form.area} onChange={set("area")} placeholder="Area" className={bareClass} />
                </IconBox>
              </Field>

              <Field label="Address">
                <IconBox icon={MapIcon}>
                  <input value={form.address} onChange={set("address")} placeholder="Address" className={bareClass} />
                </IconBox>
              </Field>
              <Field label="Due">
                <IconBox text="৳">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.openingDue}
                    onChange={set("openingDue")}
                    placeholder="Amount"
                    disabled={form.existing}
                    className={`${bareClass} disabled:opacity-50`}
                  />
                </IconBox>
              </Field>

              <Field label="Date">
                <IconBox icon={CalendarDays}>
                  <input
                    type="date"
                    value={form.openingDate}
                    onChange={set("openingDate")}
                    disabled={form.existing}
                    className={`${bareClass} disabled:opacity-50`}
                  />
                </IconBox>
              </Field>
              <Field label="Picture">
                <IconBox icon={ImageIcon}>
                  <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
                    {photoFile?.preview || form.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoFile?.preview || form.photo} alt="" className="size-7 shrink-0 rounded-full border object-cover" />
                    ) : null}
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="min-w-0 flex-1 text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1.5 file:text-xs"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setPhotoFile(file ? { file, preview: URL.createObjectURL(file) } : null);
                      }}
                    />
                    {(photoFile?.file || form.photo) && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoFile(null);
                          setForm((f) => ({ ...f, photo: "" }));
                          if (photoInputRef.current) photoInputRef.current.value = "";
                        }}
                        className="shrink-0 text-xs text-muted-foreground hover:text-red-500"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </IconBox>
              </Field>

              <Field label="Attachment">
                <IconBox icon={Paperclip}>
                  <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
                    <input
                      ref={attachInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      className="min-w-0 flex-1 text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1.5 file:text-xs"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setAttachFile(file ? { file } : null);
                      }}
                    />
                    {form.attachment && !attachFile?.file && (
                      <a href={form.attachment} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-primary underline">
                        View
                      </a>
                    )}
                  </div>
                </IconBox>
              </Field>
              <Field label="Membership Number">
                <IconBox icon={Hash}>
                  <input value={form.membershipNumber} onChange={set("membershipNumber")} placeholder="Membership Number" className={bareClass} />
                </IconBox>
              </Field>

              <Field label="Note" className="sm:col-span-2">
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={set("note")}
                  placeholder="Note"
                  maxLength={2000}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-white/10 dark:bg-transparent"
                />
              </Field>
            </div>

            {normalizeCustomerType(form.type) !== "retail" && (
              <label className="block space-y-1 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm font-medium">
                <span>
                  Portal login password {!form.hadLogin && "*"}
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set("password")}
                  placeholder={form.hadLogin ? "Leave blank to keep the current one" : "At least 4 characters"}
                  className={inputClass}
                />
                <span className="block text-[11px] font-normal text-muted-foreground">
                  They log in to the dealer portal with {form.phone || "their mobile number"} and this password. The login shows in Users.
                </span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTab("find")}
                className="h-10 rounded-lg border px-4 text-sm font-medium hover:bg-muted"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex h-10 items-center gap-2 rounded-lg bg-green-600 px-5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                Save &amp; Select
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
