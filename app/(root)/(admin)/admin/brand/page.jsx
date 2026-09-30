"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Plus } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";
import { oneLine } from "@/lib/labels";
import { useOpeningStockTill } from "@/lib/posProducts";
import { showToast } from "@/lib/showToast";
import {
  ActionMenu,
  EmptyRow,
  ListCard,
  Pagination,
  btn,
  filterInput,
  tdClass,
  thClass,
  theadClass,
} from "@/components/ui/Application/Admin/listKit";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const emptyForm = {
  name: "",
  logo: "",
  serviceCenter: "",
  warrantyMonths: 0,
  sortOrder: 0,
  isActive: true,
};

export default function BrandPage() {
  const { language } = useLanguage();
  const t = (en, bn) => oneLine(en, bn, language);
  const till = useOpeningStockTill();

  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef(null);

  useEffect(() => {
    if (!logoFile?.preview) return undefined;
    return () => URL.revokeObjectURL(logoFile.preview);
  }, [logoFile]);

  const loadBrands = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/brand");
      if (data.success) setBrands(data.data);
      else showToast("error", data.message || "Could not load brands");
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load brands");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSearch("");
    setPage(1);
    setOpen(false);
    loadBrands();
  }, [loadBrands, till.id]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setLogoFile(null);
    setOpen(true);
  };

  const openEdit = (brand) => {
    setEditingId(brand._id);
    setForm({
      name: brand.name,
      logo: brand.logo || "",
      serviceCenter: brand.serviceCenter || "",
      warrantyMonths: brand.warrantyMonths || 0,
      sortOrder: brand.sortOrder || 0,
      isActive: brand.isActive,
    });
    setLogoFile(null);
    setOpen(true);
  };

  const saveBrand = async () => {
    if (!form.name.trim()) {
      showToast("error", t("Brand name is required", "ব্র্যান্ডের নাম লাগবে"));
      return;
    }

    setSaving(true);
    let uploadedLogoId = null;
    try {
      let payload = form;
      if (logoFile?.file) {
        const body = new FormData();
        body.append("file", logoFile.file);
        const { data: uploadData } = await axios.post("/api/media/upload", body, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (!uploadData?.success || !uploadData.media?.secure_url) {
          throw new Error(uploadData?.message || t("Could not upload logo", "লোগো আপলোড হয়নি"));
        }
        uploadedLogoId = uploadData.media._id;
        payload = { ...form, logo: uploadData.media.secure_url };
      }

      const { data } = editingId
        ? await axios.put(`/api/brand/update/${editingId}`, payload)
        : await axios.post("/api/brand/create", payload);

      if (!data.success) {
        if (uploadedLogoId) {
          axios.delete("/api/media/delete", { data: { ids: [uploadedLogoId], deleteType: "PD" } }).catch(() => {});
        }
        showToast("error", data.message || t("Could not save brand", "ব্র্যান্ড সেভ হয়নি"));
        return;
      }

      showToast("success", editingId ? t("Brand updated", "ব্র্যান্ড আপডেট হয়েছে") : t("Brand created", "ব্র্যান্ড তৈরি হয়েছে"));
      setLogoFile(null);
      setOpen(false);
      loadBrands();
    } catch (error) {
      if (uploadedLogoId) {
        axios.delete("/api/media/delete", { data: { ids: [uploadedLogoId], deleteType: "PD" } }).catch(() => {});
      }
      showToast("error", error.response?.data?.message || error.message || t("Could not save brand", "ব্র্যান্ড সেভ হয়নি"));
    } finally {
      setSaving(false);
    }
  };

  const deleteBrand = async (brand) => {
    if (!confirm(t(`Move "${brand.name}" to trash?`, `"${brand.name}" ট্র্যাশে পাঠাবেন?`))) return;
    try {
      const { data } = await axios.delete(`/api/brand/delete/${brand._id}`);
      if (!data.success) {
        showToast("error", data.message || t("Could not delete brand", "ব্র্যান্ড মুছা যায়নি"));
        return;
      }
      showToast("success", t("Brand moved to trash", "ব্র্যান্ড ট্র্যাশে গেছে"));
      loadBrands();
    } catch (error) {
      showToast("error", error.response?.data?.message || t("Could not delete brand", "ব্র্যান্ড মুছা যায়নি"));
    }
  };

  const visibleBrands = useMemo(
    () => brands.filter((brand) => brand.name.toLowerCase().includes(search.trim().toLowerCase())),
    [brands, search],
  );
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(visibleBrands.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = visibleBrands.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-4">
      <ListCard
        title={t("Brand List", "ব্র্যান্ড তালিকা")}
        actions={
          <button type="button" className={btn.success} onClick={openCreate}>
            <Plus size={14} /> {t("Add New Brand", "নতুন ব্র্যান্ড")}
          </button>
        }
      >
        <form className="mb-4 flex flex-wrap items-center gap-2" onSubmit={(event) => event.preventDefault()}>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={t("Search brand", "ব্র্যান্ড খুঁজুন")}
            className={`${filterInput} min-w-[220px] flex-1`}
          />
          <button type="submit" className={btn.info}>{t("Search", "খুঁজুন")}</button>
          <button type="button" className={btn.warning} onClick={() => { setSearch(""); setPage(1); }}>
            {t("Clear", "মুছুন")}
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className={theadClass}>
                <th className={thClass}>{t("SL", "ক্রম")}</th>
                <th className={thClass}>{t("Brand", "ব্র্যান্ড")}</th>
                <th className={thClass}>{t("Warranty", "ওয়ারেন্টি")}</th>
                <th className={thClass}>{t("Service Center", "সার্ভিস সেন্টার")}</th>
                <th className={thClass}>{t("Status", "অবস্থা")}</th>
                <th className={thClass}>{t("Action", "অ্যাকশন")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className={`${tdClass} py-8 text-center`}>{t("Loading...", "লোড হচ্ছে...")}</td></tr>}
              {!loading && rows.length === 0 && (
                <EmptyRow
                  colSpan={6}
                  title={search ? t("No brand matched your search", "এই খোঁজে কোনো ব্র্যান্ড নেই") : t("No brand yet", "এখনো কোনো ব্র্যান্ড নেই")}
                />
              )}
              {!loading &&
                rows.map((brand, index) => (
                  <tr key={brand._id} className="hover:bg-[#f5f7f9] dark:hover:bg-muted/50">
                    <td className={tdClass}>{(safePage - 1) * pageSize + index + 1}</td>
                    <td className={tdClass}>
                      <div className="flex items-center gap-3 font-medium">
                        {brand.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={brand.logo} alt="" className="size-9 rounded border bg-white object-contain p-0.5" />
                        ) : (
                          <span className="flex size-9 items-center justify-center rounded bg-[#e8f4fd] text-xs font-semibold uppercase text-[#188ae2]">
                            {brand.name.slice(0, 2)}
                          </span>
                        )}
                        {brand.name}
                      </div>
                    </td>
                    <td className={tdClass}>{brand.warrantyMonths > 0 ? `${brand.warrantyMonths} ${t("months", "মাস")}` : "—"}</td>
                    <td className={`${tdClass} max-w-[240px] truncate`}>{brand.serviceCenter || "—"}</td>
                    <td className={tdClass}>
                      <span className={`rounded px-2 py-0.5 text-[12px] font-semibold ${brand.isActive ? "bg-[#e7f8ef] text-[#0e8a4a]" : "bg-[#f1f3f5] text-[#868e96]"}`}>
                        {brand.isActive ? t("Active", "সক্রিয়") : t("Inactive", "নিষ্ক্রিয়")}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <ActionMenu
                        label={t("Action", "অ্যাকশন")}
                        items={[
                          [t("Edit", "সম্পাদনা"), () => openEdit(brand)],
                          [t("Delete", "মুছুন"), () => deleteBrand(brand), "danger"],
                        ]}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={safePage}
          pages={pages}
          from={visibleBrands.length ? (safePage - 1) * pageSize + 1 : 0}
          count={rows.length}
          total={visibleBrands.length}
          onPage={setPage}
        />
      </ListCard>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setLogoFile(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t("Edit Brand", "ব্র্যান্ড সম্পাদনা") : t("New Brand", "নতুন ব্র্যান্ড")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block space-y-1 text-[13px] text-[#495057]">
              {t("Brand Name", "ব্র্যান্ডের নাম")}
              <input id="brand-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Samsung" className={filterInput} />
            </label>
            <div className="space-y-1 text-[13px] text-[#495057]">
              <span>{t("Brand Logo", "ব্র্যান্ড লোগো")}</span>
              <div className="flex items-center gap-3 rounded-[6px] border border-[#e3e3e3] p-3">
                {logoFile?.preview || form.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoFile?.preview || form.logo} alt="" className="size-16 shrink-0 rounded-md border bg-white object-contain p-1" />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-[#f7f9fb] text-xs text-[#98a6ad]">
                    {t("No logo", "লোগো নেই")}
                  </div>
                )}
                <div className="flex min-w-0 flex-wrap gap-2">
                  <input
                    ref={logoInputRef}
                    id="brand-logo-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) setLogoFile({ file, preview: URL.createObjectURL(file) });
                      event.target.value = "";
                    }}
                  />
                  <button type="button" className={btn.info} onClick={() => logoInputRef.current?.click()}>
                    {logoFile?.file || form.logo ? t("Change logo", "লোগো বদলান") : t("Upload logo", "লোগো আপলোড")}
                  </button>
                  {(logoFile?.file || form.logo) && (
                    <button
                      type="button"
                      className={btn.secondary}
                      onClick={() => {
                        setLogoFile(null);
                        setForm((current) => ({ ...current, logo: "" }));
                      }}
                    >
                      {t("Remove", "সরান")}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <label className="block space-y-1 text-[13px] text-[#495057]">
              {t("Service Center", "সার্ভিস সেন্টার")}
              <input id="brand-service" value={form.serviceCenter} onChange={(e) => setForm({ ...form, serviceCenter: e.target.value })} className={filterInput} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1 text-[13px] text-[#495057]">
                {t("Warranty (months)", "ওয়ারেন্টি (মাস)")}
                <input id="brand-warranty" type="number" min={0} value={form.warrantyMonths} onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })} className={filterInput} />
              </label>
              <label className="block space-y-1 text-[13px] text-[#495057]">
                {t("Sort Order", "ক্রম")}
                <input id="brand-sort" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className={filterInput} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="size-4" />
              {t("Active (show while adding products)", "সক্রিয় (পণ্য যোগের সময় দেখাবে)")}
            </label>
          </div>
          <DialogFooter>
            <button type="button" className={btn.secondary} onClick={() => { setOpen(false); setLogoFile(null); }}>{t("Cancel", "বাতিল")}</button>
            <button type="button" className={btn.success} onClick={saveBrand} disabled={saving}>
              {saving ? t("Saving...", "সেভ হচ্ছে...") : editingId ? t("Update", "আপডেট") : t("Save", "সেভ")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
