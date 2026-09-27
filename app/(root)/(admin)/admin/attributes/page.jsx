"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
const emptyValueForm = { categoryId: "", label: "", value: "" };

// ?slot=color is the Colors menu, ?slot=size the Storage / Size one
const TITLES = {
  color: ["Colors", "Handset colours offered while generating variants"],
  size: ["Attributes (Storage / Size)", "RAM / storage and sizes offered while generating variants"],
};

const AttributeList = () => {
  const searchParams = useSearchParams();
  const slotFilter = searchParams.get("slot") || "";
  const categoryView = searchParams.get("view") === "categories";
  const colorView = slotFilter === "color";
  const [title, subtitle] = categoryView
    ? ["Attribute Category List", "Manage categories used to organize product attributes"]
    : colorView
      ? TITLES.color
      : ["Attribute List", "Manage attribute values used when creating product variants"];
  const [allAttributes, setAttributes] = useState([]);
  const categories = allAttributes.filter((attribute) => attribute.slot !== "color");
  const visibleCategories = slotFilter && !colorView
    ? categories.filter((attribute) => attribute.slot === slotFilter)
    : categories;
  const attributeRows = visibleCategories.flatMap((category) =>
    category.values.map((value) => ({ category, value })),
  );
  const colorAttributes = colorView
    ? allAttributes.filter((attribute) => attribute.slot === "color")
    : [];
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [valueOpen, setValueOpen] = useState(false);
  const [editingValue, setEditingValue] = useState(null);
  const [valueForm, setValueForm] = useState(emptyValueForm);

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
    setForm({ ...emptyForm, slot: slotFilter || emptyForm.slot });
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

  const openValueCreate = () => {
    setEditingValue(null);
    setValueForm({ ...emptyValueForm, categoryId: visibleCategories[0]?._id || "" });
    setValueOpen(true);
  };

  const openValueEdit = (category, value) => {
    setEditingValue({ categoryId: category._id, valueId: value._id });
    setValueForm({ categoryId: category._id, label: value.label, value: value.value });
    setValueOpen(true);
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

    if (!categoryView && form.values.length === 0) {
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

  const saveValue = async () => {
    const category = allAttributes.find((item) => String(item._id) === valueForm.categoryId);
    const label = valueForm.label.trim();
    const value = (valueForm.value.trim() || label).trim();

    if (!category) return showToast("error", "Choose an attribute category");
    if (!label) return showToast("error", "Attribute name is required");
    if (category.values.some((item) =>
      item.value.toLowerCase() === value.toLowerCase() && String(item._id) !== String(editingValue?.valueId),
    )) return showToast("error", `"${value}" is already in this category`);

    const values = editingValue
      ? category.values.map((item) => String(item._id) === String(editingValue.valueId) ? { ...item, label, value } : item)
      : [...category.values, { label, value, sortOrder: category.values.length }];

    setSaving(true);
    try {
      const { data } = await axios.put(`/api/attribute/update/${category._id}`, {
        name: category.name,
        slot: category.slot,
        isActive: category.isActive,
        values,
      });

      if (!data.success) {
        showToast("error", data.message || "Could not save attribute");
        return;
      }

      showToast("success", editingValue ? "Attribute updated" : "Attribute created");
      setValueOpen(false);
      loadAttributes();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not save attribute");
    } finally {
      setSaving(false);
    }
  };

  const deleteValue = async (category, value) => {
    if (!confirm(`Delete attribute "${value.label}"?`)) return;

    try {
      const { data } = await axios.put(`/api/attribute/update/${category._id}`, {
        name: category.name,
        slot: category.slot,
        isActive: category.isActive,
        values: category.values.filter((item) => String(item._id) !== String(value._id)),
      });

      if (!data.success) {
        showToast("error", data.message || "Could not delete attribute");
        return;
      }

      showToast("success", "Attribute deleted");
      loadAttributes();
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not delete attribute");
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
  const breadcrumbData = [
    { href: ADMIN_DASHBOARD, label: "Home" },
    { href: ADMIN_ATTRIBUTE_SHOW, label: categoryView ? "Attribute Categories" : "Attributes" },
  ];

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-xl font-semibold">{title}</h4>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          <Button onClick={categoryView || colorView ? openCreate : openValueCreate}>
            <FiPlus className="mr-2" />
            {categoryView ? "Add New" : colorView ? "New Attribute" : "Add New"}
          </Button>
        </CardHeader>

        <CardContent className="px-3 pb-4">
          {loading ? (
            <div className="space-y-2 py-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : categoryView ? visibleCategories.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No attribute category yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">SL</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCategories.map((category, index) => (
                    <TableRow key={category._id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(category)} aria-label={`Edit ${category.name}`}>
                            <FiEdit2 />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteAttribute(category)} aria-label={`Delete ${category.name}`}>
                            <FiTrash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : !colorView && attributeRows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <p>No attribute yet.</p>
              <Link className="mt-2 inline-block text-primary underline" href={`${ADMIN_ATTRIBUTE_SHOW}?view=categories`}>
                Add an attribute category first
              </Link>
            </div>
          ) : !colorView ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">SL</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attributeRows.map(({ category, value }, index) => (
                    <TableRow key={`${category._id}-${value._id}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{value.label}</TableCell>
                      <TableCell>{category.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openValueEdit(category, value)} aria-label={`Edit ${value.label}`}>
                            <FiEdit2 />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteValue(category, value)} aria-label={`Delete ${value.label}`}>
                            <FiTrash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : colorAttributes.length === 0 ? (
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
                  {colorAttributes.map((attribute) => (
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
              {categoryView ? editingId ? "Edit Attribute Category" : "New Attribute Category" : editingId ? "Edit Attribute" : "New Attribute"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="attr-name">{categoryView ? "Category Name" : "Attribute Name"}</Label>
              <Input
                id="attr-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={categoryView ? "Size" : "Storage"}
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

            {!categoryView && <div className="space-y-2">
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
            </div>}

            {!categoryView && <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
                className="size-4"
              />
              Active (offer these values on new variants)
            </label>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>

            <Button onClick={saveAttribute} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update" : categoryView ? "Save" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={valueOpen} onOpenChange={setValueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingValue ? "Edit Attribute" : "New Attribute"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="value-category">Category</Label>
              <select
                id="value-category"
                className={selectClass}
                value={valueForm.categoryId}
                disabled={!!editingValue}
                onChange={(event) => setValueForm({ ...valueForm, categoryId: event.target.value })}
              >
                <option value="">Select category</option>
                {visibleCategories.map((category) => (
                  <option key={category._id} value={category._id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value-label">Name</Label>
              <Input id="value-label" value={valueForm.label} onChange={(event) => setValueForm({ ...valueForm, label: event.target.value })} placeholder="10 Rs" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value-value">Stored value</Label>
              <Input id="value-value" value={valueForm.value} onChange={(event) => setValueForm({ ...valueForm, value: event.target.value })} placeholder="Leave blank to use the name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValueOpen(false)}>Cancel</Button>
            <Button onClick={saveValue} disabled={saving}>{saving ? "Saving..." : editingValue ? "Update" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AttributePage = () => (
  <Suspense fallback={<Skeleton className="h-48 w-full" />}>
    <AttributeList />
  </Suspense>
);

export default AttributePage;
