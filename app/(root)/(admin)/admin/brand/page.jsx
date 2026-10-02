"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";
import { oneLine } from "@/lib/labels";
import { WAREHOUSE_TILL, posShowroomsQueryOptions, useOpeningStockTill, writePosShowroom } from "@/lib/posProducts";
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
  const { data: showrooms = [] } = useQuery(posShowroomsQueryOptions());

  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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
      // the selected showroom's own brands
      const { data } = await axios.get("/api/brand", { params: { showroomId: till.id } });
      if (data.success) setBrands(data.data);
      else showToast("error", data.message || "Could not load brands");
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load brands");
    } finally {
      setLoading(false);
    }
  }, [till.id]);

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
        : await axios.post("/api/brand/create", { ...payload, showroomId: till.id });

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
  const pages = Math.max(1, Math.ceil(visibleBrands.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = visibleBrands.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleBrand = async (brand) => {
    try {
      const { data } = await axios.put(`/api/brand/update/${brand._id}`, {
        name: brand.name,
        logo: brand.logo || "",
        serviceCenter: brand.serviceCenter || "",
        warrantyMonths: brand.warrantyMonths || 0,
        sortOrder: brand.sortOrder || 0,
        isActive: brand.isActive === false,
      });
      showToast(data.success ? "success" : "error", data.success ? (brand.isActive === false ? t("Brand activated", "ব্র্যান্ড চালু হয়েছে") : t("Brand deactivated", "ব্র্যান্ড বন্ধ হয়েছে")) : data.message);
      loadBrands();
    } catch (error) {
      showToast("error", error.response?.data?.message || t("Could not update brand", "ব্র্যান্ড আপডেট হয়নি"));
    }
  };

  return (
    <div className="rounded-[8px] bg-white p-[24px] shadow-[0_1px_3px_rgba(16,24,40,0.08)] dark:bg-card">
      <div className="mb-[28px] flex flex-wrap items-start justify-between gap-3">
        <h1 className="m-0 text-[22px] font-semibold text-[#212529] dark:text-foreground">{t("Brands", "ব্র্যান্ড")}</h1>
        <button type="button" onClick={openCreate} className={`${btn.primary} !px-[18px] !py-[10px] !text-[14px]`}>
          <Plus size={16} /> {t("Add New Brand", "নতুন ব্র্যান্ড")}
        </button>
      </div>

      <div className="mb-[22px] flex flex-wrap items-center gap-3">
        <select
          value={pageSize}
          onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
          className={`${filterInput} !h-[48px] !w-[100px]`}
        >
          {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select
          value={till.id}
          onChange={(event) => writePosShowroom(event.target.value)}
          className={`${filterInput} !h-[48px] !w-[358px] max-w-full`}
        >
          {till.id === WAREHOUSE_TILL && <option value={WAREHOUSE_TILL}>{t("Ware House", "ওয়্যারহাউস")}</option>}
          {showrooms.filter((s) => s.isActive !== false).map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[16px]">
          <thead>
            <tr className="bg-[#1fa463] text-white">
              <th className={`${thClass} !w-[76px] !text-[16px]`}>{t("SL", "ক্রম")}</th>
              <th className={`${thClass} !text-[16px]`}>{t("Brand Name", "ব্র্যান্ডের নাম")}</th>
              <th className={`${thClass} !text-[16px]`}>{t("Warranty", "ওয়ারেন্টি")}</th>
              <th className={`${thClass} !text-[16px]`}>{t("Action", "অ্যাকশন")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className={`${tdClass} py-8 text-center`}>{t("Loading...", "লোড হচ্ছে...")}</td></tr>}
            {!loading && rows.length === 0 && (
              <EmptyRow colSpan={4} title={t("No brand yet", "এখনো কোনো ব্র্যান্ড নেই")} />
            )}
            {!loading &&
              rows.map((brand, index) => (
                <tr key={brand._id} className="odd:bg-[#f4f7fa] dark:odd:bg-muted/40">
                  <td className={`${tdClass} !text-[16px]`}>{(safePage - 1) * pageSize + index + 1}</td>
                  <td className={tdClass}>
                    <div className="flex items-center gap-3 text-[17px]">
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
                  <td className={`${tdClass} !text-[16px]`}>{brand.warrantyMonths > 0 ? `${brand.warrantyMonths} ${t("months", "মাস")}` : "—"}</td>
                  <td className={tdClass}>
                    <div className="flex">
                      <button type="button" onClick={() => openEdit(brand)} className="rounded-l-[4px] bg-[#188ae2] px-[14px] py-[8px] text-[14px] font-medium text-white hover:bg-[#1379c7]">
                        {t("Edit", "সম্পাদনা")}
                      </button>
                      <button type="button" onClick={() => toggleBrand(brand)} className="bg-[#f9c851] px-[14px] py-[8px] text-[14px] font-medium text-white hover:bg-[#f0b93a]">
                        {brand.isActive === false ? t("Active", "চালু") : t("Deactive", "বন্ধ")}
                      </button>
                      <button type="button" onClick={() => deleteBrand(brand)} className="rounded-r-[4px] bg-[#ff5b5b] px-[14px] py-[8px] text-[14px] font-medium text-white hover:bg-[#f24242]">
                        {t("Delete", "মুছুন")}
                      </button>
                    </div>
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

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setLogoFile(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-[620px] gap-0 overflow-y-auto p-0">
          <DialogHeader className="border-b bg-[#f7f7f7] px-[26px] py-[24px]">
            <DialogTitle className="text-[20px] font-medium">{editingId ? t("Brand Update", "ব্র্যান্ড আপডেট") : t("Brand Create", "ব্র্যান্ড তৈরি")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-[26px] py-[22px]">
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
          <div className="flex justify-end gap-2 px-[26px] pb-[22px]">
            <button type="button" onClick={saveBrand} disabled={saving} className="rounded-[4px] bg-[#10c469] px-[18px] py-[10px] text-[15px] font-medium text-white hover:bg-[#0dab5b] disabled:opacity-60">
              {saving ? t("Saving...", "সেভ হচ্ছে...") : editingId ? t("Update", "আপডেট") : t("Save", "সেভ")}
            </button>
            <button type="button" onClick={() => { setOpen(false); setLogoFile(null); }} className="rounded-[4px] bg-[#ff5b5b] px-[18px] py-[10px] text-[15px] font-medium text-white hover:bg-[#f24242]">
              {t("Close", "বন্ধ")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
