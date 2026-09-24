"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FiEdit2, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { showToast } from "@/lib/showToast";
import { ADMIN_DASHBOARD, ADMIN_SUPPLIER_SHOW } from "@/Route/Adminpannelroute";

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
import { Textarea } from "@/components/ui/textarea";
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
  { href: ADMIN_SUPPLIER_SHOW, label: "Suppliers" },
];

const emptyForm = {
  name: "",
  companyName: "",
  phone: "",
  email: "",
  address: "",
  openingBalance: 0,
  note: "",
  isActive: true,
};

const SupplierPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get("/api/supplier");

      if (data.success) {
        setSuppliers(data.data);
      } else {
        showToast("error", data.message || "Could not load suppliers");
      }
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not load suppliers",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (supplier) => {
    setEditingId(supplier._id);
    setForm({
      name: supplier.name,
      companyName: supplier.companyName || "",
      phone: supplier.phone,
      email: supplier.email || "",
      address: supplier.address || "",
      openingBalance: supplier.openingBalance || 0,
      note: supplier.note || "",
      isActive: supplier.isActive,
    });
    setOpen(true);
  };

  const saveSupplier = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      showToast("error", "Supplier name and phone are required");
      return;
    }

    setSaving(true);

    try {
      const { data } = editingId
        ? await axios.put(`/api/supplier/update/${editingId}`, form)
        : await axios.post("/api/supplier/create", form);

      if (!data.success) {
        showToast("error", data.message || "Could not save supplier");
        return;
      }

      showToast("success", editingId ? "Supplier updated" : "Supplier created");
      setOpen(false);
      loadSuppliers();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not save supplier",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteSupplier = async (supplier) => {
    if (!confirm(`Move "${supplier.name}" to trash?`)) return;

    try {
      const { data } = await axios.delete(
        `/api/supplier/delete/${supplier._id}`,
      );

      if (!data.success) {
        showToast("error", data.message || "Could not delete supplier");
        return;
      }

      showToast("success", "Supplier moved to trash");
      loadSuppliers();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not delete supplier",
      );
    }
  };

  const term = search.trim().toLowerCase();

  const visibleSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(term) ||
      (supplier.companyName || "").toLowerCase().includes(term) ||
      supplier.phone.includes(term),
  );

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-xl font-semibold">Suppliers</h4>

          <div className="flex items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, company or phone"
                className="pl-9 w-full sm:w-64"
              />
            </div>

            <Button onClick={openCreate}>
              <FiPlus className="mr-2" />
              New Supplier
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
          ) : visibleSuppliers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {search
                ? "No supplier matched your search."
                : "No supplier yet. Add the importers and distributors you buy from."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">
                      Opening Balance
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {visibleSuppliers.map((supplier) => (
                    <TableRow key={supplier._id}>
                      <TableCell>
                        <div className="font-medium">{supplier.name}</div>
                        {supplier.companyName && (
                          <div className="text-xs text-muted-foreground">
                            {supplier.companyName}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>{supplier.phone}</TableCell>

                      <TableCell className="text-right tabular-nums">
                        {supplier.openingBalance > 0
                          ? `৳ ${supplier.openingBalance.toLocaleString()}`
                          : "—"}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={supplier.isActive ? "default" : "secondary"}
                        >
                          {supplier.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(supplier)}
                          >
                            <FiEdit2 />
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteSupplier(supplier)}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Supplier" : "New Supplier"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier-name">Supplier Name</Label>
                <Input
                  id="supplier-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Rahim Traders"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-phone">Phone</Label>
                <Input
                  id="supplier-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="01XXXXXXXXX"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier-company">Company</Label>
                <Input
                  id="supplier-company"
                  value={form.companyName}
                  onChange={(e) =>
                    setForm({ ...form, companyName: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-email">Email</Label>
                <Input
                  id="supplier-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-address">Address</Label>
              <Textarea
                id="supplier-address"
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-opening">Opening Balance (due)</Label>
              <Input
                id="supplier-opening"
                type="number"
                value={form.openingBalance}
                onChange={(e) =>
                  setForm({ ...form, openingBalance: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Old due from before this software. Leave 0 if none.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-note">Note</Label>
              <Textarea
                id="supplier-note"
                rows={2}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
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
              Active (show while creating a purchase)
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>

            <Button onClick={saveSupplier} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierPage;
