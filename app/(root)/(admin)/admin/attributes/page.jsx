"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { showToast } from "@/lib/showToast";
import { ADMIN_ATTRIBUTE_SHOW, ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";

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
  { href: ADMIN_ATTRIBUTE_SHOW, label: "Attributes" },
];

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const SLOTS = [
  {
    value: "size",
    label: "Variant Size dropdown",
    hint: "For a phone shop this is RAM / Storage, e.g. 8GB / 128GB",
  },
  {
    value: "color",
    label: "Variant Color field",
    hint: "Handset colours offered while creating a variant",
  },
  {
    value: "spec",
    label: "Specification only",
    hint: "Descriptive, e.g. Network or Display. Not offered on variants",
  },
];

const emptyForm = { name: "", slot: "size", isActive: true, values: [] };

const AttributePage = () => {
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");

  const loadAttributes = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get("/api/attribute");

      if (data.success) {
        setAttributes(data.data);
      } else {
        showToast("error", data.message || "Could not load attributes");
      }
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not load attributes",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttributes();
  }, [loadAttributes]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setNewLabel("");
    setNewValue("");
    setOpen(true);
  };

  const openEdit = (attribute) => {
    setEditingId(attribute._id);
    setForm({
      name: attribute.name,
      slot: attribute.slot,
      isActive: attribute.isActive,
      values: attribute.values.map((item) => ({
        label: item.label,
        value: item.value,
        sortOrder: item.sortOrder,
      })),
    });
    setNewLabel("");
    setNewValue("");
    setOpen(true);
  };

  const addValue = () => {
    const label = newLabel.trim();

    if (!label) return;

    const value = (newValue.trim() || label).trim();

    if (
      form.values.some(
        (item) => item.value.toLowerCase() === value.toLowerCase(),
      )
    ) {
      showToast("error", `"${value}" is already in this list`);
      return;
    }

    setForm({
      ...form,
      values: [
        ...form.values,
        { label, value, sortOrder: form.values.length },
      ],
    });

    setNewLabel("");
    setNewValue("");
  };

  const removeValue = (index) => {
    setForm({
      ...form,
      values: form.values.filter((_, i) => i !== index),
    });
  };

  const saveAttribute = async () => {
    if (!form.name.trim()) {
      showToast("error", "Attribute name is required");
      return;
    }

    if (form.values.length === 0) {
      showToast("error", "Add at least one value");
      return;
    }

    setSaving(true);

    try {
      const { data } = editingId
        ? await axios.put(`/api/attribute/update/${editingId}`, form)
        : await axios.post("/api/attribute/create", form);

      if (!data.success) {
        showToast("error", data.message || "Could not save attribute");
        return;
      }

      showToast(
        "success",
        editingId ? "Attribute updated" : "Attribute created",
      );
      setOpen(false);
      loadAttributes();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not save attribute",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteAttribute = async (attribute) => {
    if (!confirm(`Move "${attribute.name}" to trash?`)) return;

    try {
      const { data } = await axios.delete(
        `/api/attribute/delete/${attribute._id}`,
      );

      if (!data.success) {
        showToast("error", data.message || "Could not delete attribute");
        return;
      }

      showToast("success", "Attribute moved to trash");
      loadAttributes();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not delete attribute",
      );
    }
  };

  const slotLabel = (slot) =>
    SLOTS.find((item) => item.value === slot)?.label || slot;

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-xl font-semibold">Attributes</h4>
            <p className="text-sm text-muted-foreground">
              The lists offered while creating a product variant
            </p>
          </div>

          <Button onClick={openCreate}>
            <FiPlus className="mr-2" />
            New Attribute
          </Button>
        </CardHeader>

        <CardContent className="px-3 pb-4">
          {loading ? (
            <div className="space-y-2 py-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : attributes.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <p>No attribute yet.</p>
              <p className="mt-1">
                Until one is added, the variant Size dropdown still shows the
                clothing sizes the project shipped with. Add a{" "}
                <span className="font-medium text-foreground">Storage</span>{" "}
                attribute holding 8/128, 8/256, 12/256 to replace them.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attribute</TableHead>
                    <TableHead>Used for</TableHead>
                    <TableHead>Values</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {attributes.map((attribute) => (
                    <TableRow key={attribute._id}>
                      <TableCell className="font-medium">
                        {attribute.name}
                      </TableCell>

                      <TableCell>{slotLabel(attribute.slot)}</TableCell>

                      <TableCell>
                        <div className="flex max-w-md flex-wrap gap-1">
                          {attribute.values.slice(0, 6).map((item) => (
                            <Badge key={item._id} variant="outline">
                              {item.label}
                            </Badge>
                          ))}
                          {attribute.values.length > 6 && (
                            <Badge variant="secondary">
                              +{attribute.values.length - 6}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={attribute.isActive ? "default" : "secondary"}
                        >
                          {attribute.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(attribute)}
                          >
                            <FiEdit2 />
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteAttribute(attribute)}
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
              {editingId ? "Edit Attribute" : "New Attribute"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="attr-name">Attribute Name</Label>
              <Input
                id="attr-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Storage"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attr-slot">Used for</Label>
              <select
                id="attr-slot"
                className={selectClass}
                value={form.slot}
                onChange={(e) => setForm({ ...form, slot: e.target.value })}
              >
                {SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {SLOTS.find((slot) => slot.value === form.slot)?.hint}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Values</Label>

              <div className="flex gap-2">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="8GB / 128GB"
                  onKeyDown={(e) => e.key === "Enter" && addValue()}
                />
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="8/128"
                  className="w-32"
                  onKeyDown={(e) => e.key === "Enter" && addValue()}
                />
                <Button type="button" onClick={addValue}>
                  Add
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Left is what staff see, right is what gets stored on the
                variant. Leave the right blank to store the same text.
              </p>

              {form.values.length > 0 && (
                <ul className="max-h-56 space-y-1 overflow-y-auto pt-2">
                  {form.values.map((item, index) => (
                    <li
                      key={`${item.value}-${index}`}
                      className="flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm"
                    >
                      <span>
                        {item.label}
                        {item.label !== item.value && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            → {item.value}
                          </span>
                        )}
                      </span>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeValue(index)}
                      >
                        <FiTrash2 className="text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
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
              Active (offer these values on new variants)
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>

            <Button onClick={saveAttribute} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttributePage;
