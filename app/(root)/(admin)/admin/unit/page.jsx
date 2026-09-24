"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { ADMIN_DASHBOARD, ADMIN_UNIT_SHOW } from "@/Route/Adminpannelroute";

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
  { href: ADMIN_UNIT_SHOW, label: "Units" },
];

const emptyForm = {
  name: "",
  shortName: "",
  baseValue: 1,
  isActive: true,
};

const UnitPage = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadUnits = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get("/api/unit");

      if (data.success) {
        setUnits(data.data);
      } else {
        toast.error(data.message || "Could not load units");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load units");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (unit) => {
    setEditingId(unit._id);
    setForm({
      name: unit.name,
      shortName: unit.shortName,
      baseValue: unit.baseValue || 1,
      isActive: unit.isActive,
    });
    setOpen(true);
  };

  const saveUnit = async () => {
    if (!form.name.trim() || !form.shortName.trim()) {
      toast.error("Unit name and short name are both required");
      return;
    }

    setSaving(true);

    try {
      const { data } = editingId
        ? await axios.put(`/api/unit/update/${editingId}`, form)
        : await axios.post("/api/unit/create", form);

      if (!data.success) {
        toast.error(data.message || "Could not save unit");
        return;
      }

      toast.success(editingId ? "Unit updated" : "Unit created");
      setOpen(false);
      loadUnits();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save unit");
    } finally {
      setSaving(false);
    }
  };

  const deleteUnit = async (unit) => {
    if (!confirm(`Move "${unit.name}" to trash?`)) return;

    try {
      const { data } = await axios.delete(`/api/unit/delete/${unit._id}`);

      if (!data.success) {
        toast.error(data.message || "Could not delete unit");
        return;
      }

      toast.success("Unit moved to trash");
      loadUnits();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete unit");
    }
  };

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-row items-center justify-between">
          <h4 className="text-xl font-semibold">Units</h4>

          <Button onClick={openCreate}>
            <FiPlus className="mr-2" />
            New Unit
          </Button>
        </CardHeader>

        <CardContent className="px-3 pb-4">
          {loading ? (
            <div className="space-y-2 py-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : units.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No unit yet. Add Pcs, Box, Set — whatever you sell by.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Short Name</TableHead>
                    <TableHead>Base Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {units.map((unit) => (
                    <TableRow key={unit._id}>
                      <TableCell className="font-medium">{unit.name}</TableCell>

                      <TableCell>{unit.shortName}</TableCell>

                      <TableCell>{unit.baseValue}</TableCell>

                      <TableCell>
                        <Badge variant={unit.isActive ? "default" : "secondary"}>
                          {unit.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(unit)}
                          >
                            <FiEdit2 />
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteUnit(unit)}
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
            <DialogTitle>{editingId ? "Edit Unit" : "New Unit"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unit-name">Unit Name</Label>
              <Input
                id="unit-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Piece"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit-short">Short Name</Label>
              <Input
                id="unit-short"
                value={form.shortName}
                onChange={(e) =>
                  setForm({ ...form, shortName: e.target.value })
                }
                placeholder="Pcs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit-base">Base Value</Label>
              <Input
                id="unit-base"
                type="number"
                min={1}
                value={form.baseValue}
                onChange={(e) =>
                  setForm({ ...form, baseValue: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                How many base units this holds. 1 Box = 12 Pcs → base value 12.
              </p>
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

            <Button onClick={saveUnit} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnitPage;
