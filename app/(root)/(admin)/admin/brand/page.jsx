"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiEdit2, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { ADMIN_BRAND_SHOW, ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_BRAND_SHOW, label: "Brands" },
];

const emptyForm = {
  name: "",
  logo: "",
  serviceCenter: "",
  warrantyMonths: 0,
  sortOrder: 0,
  isActive: true,
};

const BrandPage = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadBrands = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get("/api/brand");

      if (data.success) {
        setBrands(data.data);
      } else {
        toast.error(data.message || "Could not load brands");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load brands");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
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
    setOpen(true);
  };

  const saveBrand = async () => {
    if (!form.name.trim()) {
      toast.error("Brand name is required");
      return;
    }

    setSaving(true);

    try {
      const { data } = editingId
        ? await axios.put(`/api/brand/update/${editingId}`, form)
        : await axios.post("/api/brand/create", form);

      if (!data.success) {
        toast.error(data.message || "Could not save brand");
        return;
      }

      toast.success(editingId ? "Brand updated" : "Brand created");
      setOpen(false);
      loadBrands();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save brand");
    } finally {
      setSaving(false);
    }
  };

  const deleteBrand = async (brand) => {
    if (!confirm(`Move "${brand.name}" to trash?`)) return;

    try {
      const { data } = await axios.delete(`/api/brand/delete/${brand._id}`);

      if (!data.success) {
        toast.error(data.message || "Could not delete brand");
        return;
      }

      toast.success("Brand moved to trash");
      loadBrands();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete brand");
    }
  };

  const visibleBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-xl font-semibold">Brands</h4>

          <div className="flex items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brand"
                className="pl-9 w-full sm:w-56"
              />
            </div>

            <Button onClick={openCreate}>
              <FiPlus className="mr-2" />
              New Brand
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-3 pb-4">
          {loading ? (
            <div className="space-y-2 py-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : visibleBrands.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {search
                ? "No brand matched your search."
                : "No brand yet. Add Samsung, Xiaomi, Realme and the rest you sell."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Warranty</TableHead>
                    <TableHead>Service Center</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {visibleBrands.map((brand) => (
                    <TableRow key={brand._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {brand.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={brand.logo}
                              alt={brand.name}
                              className="size-9 rounded object-contain"
                            />
                          ) : (
                            <span className="flex size-9 items-center justify-center rounded bg-primary/10 text-xs font-semibold uppercase text-primary">
                              {brand.name.slice(0, 2)}
                            </span>
                          )}
                          {brand.name}
                        </div>
                      </TableCell>

                      <TableCell>
                        {brand.warrantyMonths > 0
                          ? `${brand.warrantyMonths} months`
                          : "—"}
                      </TableCell>

                      <TableCell className="max-w-[240px] truncate">
                        {brand.serviceCenter || "—"}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={brand.isActive ? "default" : "secondary"}
                        >
                          {brand.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(brand)}
                          >
                            <FiEdit2 />
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteBrand(brand)}
                          >
                            <FiTrash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Brand" : "New Brand"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">Brand Name</Label>
              <Input
                id="brand-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Samsung"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-logo">Logo URL</Label>
              <Input
                id="brand-logo"
                value={form.logo}
                onChange={(e) => setForm({ ...form, logo: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-service">Service Center</Label>
              <Input
                id="brand-service"
                value={form.serviceCenter}
                onChange={(e) =>
                  setForm({ ...form, serviceCenter: e.target.value })
                }
                placeholder="Address or phone for warranty handover"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="brand-warranty">Default Warranty (months)</Label>
                <Input
                  id="brand-warranty"
                  type="number"
                  min={0}
                  value={form.warrantyMonths}
                  onChange={(e) =>
                    setForm({ ...form, warrantyMonths: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand-sort">Sort Order</Label>
                <Input
                  id="brand-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: e.target.value })
                  }
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
                className="size-4"
              />
              Active (show while adding products)
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>

            <Button onClick={saveBrand} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrandPage;
