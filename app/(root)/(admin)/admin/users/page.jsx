"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { FiEdit2, FiPlus, FiSearch, FiShield, FiTrash2 } from "react-icons/fi";
import { Store } from "lucide-react";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { showToast } from "@/lib/showToast";
import {
  ADMIN_DASHBOARD,
  ADMIN_ROLES,
  ADMIN_USERS,
  ADMIN_USER_CREATE,
} from "@/Route/Adminpannelroute";
import { bdOperator, formatDateBD, isValidBdMobile } from "@/lib/bdFormat";

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
  { href: ADMIN_USERS, label: "Users" },
];

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (search.trim()) params.set("search", search.trim());
      if (status !== "all") params.set("status", status);

      const { data } = await axios.get(`/api/users?${params.toString()}`);

      if (!data.success) {
        showToast("error", data.message || "Could not load users");
        return;
      }

      setUsers(data.data);
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load users");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(loadUsers, 250);

    return () => clearTimeout(timer);
  }, [loadUsers]);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const { data } = await axios.get("/api/role");

        if (data.success) setRoles(data.data.filter((r) => r.isActive));
      } catch {
        // The list still works without them; only the edit dialog needs roles
      }
    };

    loadRoles();
  }, []);

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      roleId: user.roleId || "",
      isActive: user.isActive,
      password: "",
    });
  };

  const saveUser = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      showToast("error", "Name and email are required");
      return;
    }

    if (form.phone && !isValidBdMobile(form.phone)) {
      showToast("error", "Enter a Bangladeshi mobile number (01XXXXXXXXX)");
      return;
    }

    if (form.password && form.password.length < 6) {
      showToast("error", "Password must be at least 6 characters");
      return;
    }

    setSaving(true);

    try {
      const { data } = await axios.put(
        `/api/users/update/${editing._id}`,
        form,
      );

      if (!data.success) {
        showToast("error", data.message || "Could not save the user");
        return;
      }

      showToast(
        "success",
        form.password ? "Saved — their old sessions are signed out" : "Saved",
      );
      setEditing(null);
      loadUsers();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not save the user",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user) => {
    if (!confirm(`Remove ${user.name}'s login?`)) return;

    try {
      const { data } = await axios.delete(`/api/users/delete/${user._id}`);

      if (!data.success) {
        showToast("error", data.message || "Could not remove the user");
        return;
      }

      showToast("success", "Login removed");
      loadUsers();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not remove the user",
      );
    }
  };

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h4 className="text-xl font-semibold">Users</h4>
            <p className="text-sm text-muted-foreground">
              {users.length} staff login{users.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, email or phone"
                className="pl-9 w-full sm:w-56"
              />
            </div>

            <select
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <Button variant="outline" asChild>
              <Link href={ADMIN_ROLES}>
                <FiShield className="mr-2" />
                Roles
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link href="/admin/partners">
                <Store className="mr-2 size-4" />
                Dealers &amp; Wholesalers
              </Link>
            </Button>

            <Button asChild>
              <Link href={ADMIN_USER_CREATE}>
                <FiPlus className="mr-2" />
                New User
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-3 pb-4">
          {loading ? (
            <div className="space-y-2 py-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No user found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Showroom</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Added {formatDateBD(user.createdAt)}
                        </div>
                      </TableCell>

                      <TableCell>{user.email}</TableCell>

                      <TableCell>
                        {user.phone ? (
                          <>
                            {user.phone}
                            {bdOperator(user.phone) && (
                              <span className="block text-xs text-muted-foreground">
                                {bdOperator(user.phone)}
                              </span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell className="capitalize">
                        {user.roleName}
                      </TableCell>

                      <TableCell>{user.showroom || "—"}</TableCell>

                      <TableCell>
                        <Badge
                          variant={user.isActive ? "default" : "secondary"}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(user)}
                          >
                            <FiEdit2 />
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteUser(user)}
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

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editing?.name}</DialogTitle>
          </DialogHeader>

          {form && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email (login)</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Mobile Number</Label>
                <Input
                  id="edit-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="01712345678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <select
                  id="edit-role"
                  className={`${selectClass} w-full`}
                  value={form.roleId}
                  onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                >
                  <option value="">Keep as is</option>
                  {roles.map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-password">New Password</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Leave blank to keep the current one"
                />
                <p className="text-xs text-muted-foreground">
                  Setting a new password signs them out everywhere.
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
                Active (can sign in)
              </label>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>

            <Button onClick={saveUser} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
