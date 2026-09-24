"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  FiChevronDown,
  FiChevronRight,
  FiSave,
  FiSearch,
} from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { showToast } from "@/lib/showToast";
import { ADMIN_DASHBOARD, ADMIN_ROLES } from "@/Route/Adminpannelroute";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_ROLES, label: "Roles" },
  { href: "#", label: "Role" },
];

const RoleForm = () => {
  const router = useRouter();
  const editingId = useSearchParams().get("id");

  const [groups, setGroups] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSystem, setIsSystem] = useState(false);
  const [systemKey, setSystemKey] = useState("");

  const [selected, setSelected] = useState(() => new Set());
  const [open, setOpen] = useState(() => new Set());
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get("/api/role");

      if (!data.success) {
        showToast("error", data.message || "Could not load permissions");
        return;
      }

      setGroups(data.groups);
      setTotal(data.permissionCount);

      if (editingId) {
        const role = data.data.find((r) => String(r._id) === String(editingId));

        if (!role) {
          showToast("error", "Role not found");
          router.push(ADMIN_ROLES);
          return;
        }

        setName(role.name);
        setDescription(role.description || "");
        setIsActive(role.isActive);
        setIsSystem(role.isSystem);
        setSystemKey(role.systemKey || "");
        setSelected(new Set(role.permissions));
        // Open the groups this role already touches
        setOpen(
          new Set(
            data.groups
              .filter((g) =>
                g.permissions.some(([key]) => role.permissions.includes(key)),
              )
              .map((g) => g.key),
          ),
        );
      } else {
        setOpen(new Set([data.groups[0]?.key].filter(Boolean)));
      }
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not load permissions",
      );
    } finally {
      setLoading(false);
    }
  }, [editingId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const term = search.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    if (!term) return groups;

    return groups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter(
          ([key, label]) =>
            key.toLowerCase().includes(term) ||
            label.toLowerCase().includes(term) ||
            group.label.toLowerCase().includes(term),
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [groups, term]);

  const toggle = (key) => {
    setSelected((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleGroup = (group, on) => {
    setSelected((current) => {
      const next = new Set(current);

      for (const [key] of group.permissions) {
        on ? next.add(key) : next.delete(key);
      }

      return next;
    });
  };

  const toggleAll = (on) => {
    if (!on) {
      setSelected(new Set());
      return;
    }

    setSelected(
      new Set(groups.flatMap((g) => g.permissions.map(([key]) => key))),
    );
  };

  const coverage = total > 0 ? Math.round((selected.size / total) * 100) : 0;

  const save = async () => {
    if (!name.trim()) {
      showToast("error", "Give the role a name");
      return;
    }

    if (selected.size === 0) {
      showToast("error", "Tick at least one permission");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name,
        description,
        isActive,
        permissions: [...selected],
      };

      const { data } = editingId
        ? await axios.put(`/api/role/update/${editingId}`, payload)
        : await axios.post("/api/role/create", payload);

      if (!data.success) {
        showToast("error", data.message || "Could not save the role");
        return;
      }

      showToast("success", editingId ? "Role updated" : "Role created");
      router.push(ADMIN_ROLES);
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not save the role",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <BreadCrumb breadcrumbData={breadcrumbData} />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const adminLocked = systemKey === "admin";

  return (
    <div className="space-y-4">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-xl font-semibold">
              {editingId ? "Edit Role" : "New Role"}
            </h4>
            <p className="text-sm text-muted-foreground">
              {selected.size} of {total} permissions · {coverage}% coverage
            </p>
          </div>

          <Button onClick={save} disabled={saving || adminLocked}>
            <FiSave className="mr-2" />
            {saving ? "Saving..." : editingId ? "Update Role" : "Create Role"}
          </Button>
        </CardHeader>

        <CardContent className="px-3 py-4 space-y-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${coverage}%`,
                backgroundColor: "var(--chart-2)",
              }}
            />
          </div>

          {adminLocked && (
            <p className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              Admin always holds every permission, so that a feature added
              later is never locked away from the owner. It cannot be narrowed.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Stock Keeper"
                disabled={isSystem}
              />
              {isSystem && (
                <p className="text-xs text-muted-foreground">
                  This role ships with the app, so its name is fixed.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-desc">Description</Label>
              <Textarea
                id="role-desc"
                rows={1}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this role is for"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4"
            />
            Active (can be given to a user)
          </label>
        </CardContent>
      </Card>

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h4 className="text-lg font-semibold">Permissions</h4>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search permissions"
                className="pl-9 w-full sm:w-56"
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(new Set(groups.map((g) => g.key)))}
            >
              Expand all
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(new Set())}
            >
              Collapse all
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={adminLocked}
              onClick={() => toggleAll(selected.size < total)}
            >
              {selected.size < total ? "Select all" : "Clear all"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-3 py-4">
          {visibleGroups.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No permission matched &quot;{search}&quot;.
            </p>
          ) : (
            <ul className="space-y-2">
              {visibleGroups.map((group) => {
                const keys = group.permissions.map(([key]) => key);
                const on = keys.filter((key) => selected.has(key)).length;
                const isOpen = open.has(group.key) || !!term;

                return (
                  <li key={group.key} className="rounded border">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          setOpen((current) => {
                            const next = new Set(current);
                            next.has(group.key)
                              ? next.delete(group.key)
                              : next.add(group.key);
                            return next;
                          })
                        }
                        className="flex items-center gap-2 text-sm font-medium"
                      >
                        {isOpen ? (
                          <FiChevronDown className="size-4" />
                        ) : (
                          <FiChevronRight className="size-4" />
                        )}
                        {group.label}
                      </button>

                      <Badge variant={on > 0 ? "default" : "secondary"}>
                        {on}/{keys.length}
                      </Badge>

                      <div className="ml-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={adminLocked}
                          onClick={() => toggleGroup(group, on < keys.length)}
                        >
                          {on < keys.length ? "Select group" : "Clear group"}
                        </Button>
                      </div>
                    </div>

                    {isOpen && (
                      <ul className="grid gap-1 border-t px-3 py-2 sm:grid-cols-2">
                        {group.permissions.map(([key, label]) => (
                          <li key={key}>
                            <label className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent/50">
                              <input
                                type="checkbox"
                                checked={selected.has(key)}
                                disabled={adminLocked}
                                onChange={() => toggle(key)}
                                className="mt-0.5 size-4"
                              />
                              <span>
                                {label}
                                <span className="block text-[11px] text-muted-foreground">
                                  {key}
                                </span>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push(ADMIN_ROLES)}>
          Cancel
        </Button>

        <Button onClick={save} disabled={saving || adminLocked}>
          <FiSave className="mr-2" />
          {saving ? "Saving..." : editingId ? "Update Role" : "Create Role"}
        </Button>
      </div>
    </div>
  );
};

const RoleManagePage = () => (
  <Suspense fallback={<Skeleton className="h-96 w-full" />}>
    <RoleForm />
  </Suspense>
);

export default RoleManagePage;
