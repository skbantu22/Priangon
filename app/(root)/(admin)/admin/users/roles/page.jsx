"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { FiEdit2, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { showToast } from "@/lib/showToast";
import {
  ADMIN_DASHBOARD,
  ADMIN_ROLES,
  ADMIN_ROLE_MANAGE,
} from "@/Route/Adminpannelroute";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  { href: ADMIN_ROLES, label: "Roles" },
];

const RolesPage = () => {
  const [roles, setRoles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadRoles = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get("/api/role");

      if (!data.success) {
        showToast("error", data.message || "Could not load roles");
        return;
      }

      setRoles(data.data);
      setTotal(data.permissionCount);
    } catch (error) {
      showToast("error", error.response?.data?.message || "Could not load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const deleteRole = async (role) => {
    if (!confirm(`Delete the "${role.name}" role?`)) return;

    try {
      const { data } = await axios.delete(`/api/role/delete/${role._id}`);

      if (!data.success) {
        showToast("error", data.message || "Could not delete the role");
        return;
      }

      showToast("success", "Role deleted");
      loadRoles();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not delete the role",
      );
    }
  };

  const term = search.trim().toLowerCase();

  const visible = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(term) ||
      (role.description || "").toLowerCase().includes(term),
  );

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-xl font-semibold">Roles</h4>
            <p className="text-sm text-muted-foreground">
              What each kind of login is allowed to do
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roles"
                className="pl-9 w-full sm:w-52"
              />
            </div>

            <Button asChild>
              <Link href={ADMIN_ROLE_MANAGE()}>
                <FiPlus className="mr-2" />
                New Role
              </Link>
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
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No role matched your search.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {visible.map((role) => {
                    const coverage =
                      total > 0
                        ? Math.round((role.permissions.length / total) * 100)
                        : 0;

                    return (
                      <TableRow key={role._id}>
                        <TableCell>
                          <div className="flex items-center gap-2 font-medium">
                            {role.name}
                            {role.isSystem && (
                              <Badge variant="outline">built-in</Badge>
                            )}
                          </div>
                          {role.description && (
                            <div className="text-xs text-muted-foreground">
                              {role.description}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-1.5 rounded-full"
                                style={{
                                  width: `${coverage}%`,
                                  backgroundColor: "var(--chart-2)",
                                }}
                              />
                            </div>
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {role.permissions.length}/{total}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right tabular-nums">
                          {role.userCount}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={role.isActive ? "default" : "secondary"}
                          >
                            {role.isActive ? "Active" : "Off"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={ADMIN_ROLE_MANAGE(role._id)}>
                                <FiEdit2 />
                              </Link>
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={role.isSystem}
                              title={
                                role.isSystem
                                  ? "A built-in role cannot be deleted"
                                  : "Delete"
                              }
                              onClick={() => deleteRole(role)}
                            >
                              <FiTrash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RolesPage;
