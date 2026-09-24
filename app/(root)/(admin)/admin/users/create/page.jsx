"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FiSave } from "react-icons/fi";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { showToast } from "@/lib/showToast";
import {
  ADMIN_DASHBOARD,
  ADMIN_USERS,
  ADMIN_USER_CREATE,
} from "@/Route/Adminpannelroute";
import { bdOperator, isValidBdMobile } from "@/lib/bdFormat";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_USERS, label: "Users" },
  { href: ADMIN_USER_CREATE, label: "New User" },
];

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const empty = {
  name: "",
  phone: "",
  email: "",
  roleId: "",
  showroomId: "",
  password: "",
  confirm: "",
};

const CreateUserPage = () => {
  const router = useRouter();

  const [roles, setRoles] = useState([]);
  const [showrooms, setShowrooms] = useState([]);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [roleRes, showroomRes] = await Promise.all([
          axios.get("/api/role"),
          axios.get("/api/showrooms"),
        ]);

        if (roleRes.data?.success) {
          setRoles(roleRes.data.data.filter((role) => role.isActive));
        }

        const list = showroomRes.data?.data || showroomRes.data;
        if (Array.isArray(list)) setShowrooms(list);
      } catch {
        showToast("error", "Could not load roles");
      }
    };

    load();
  }, []);

  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  const phoneError =
    form.phone && !isValidBdMobile(form.phone)
      ? "Use a Bangladeshi mobile number, e.g. 01712345678"
      : "";

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      showToast("error", "Name and email are required");
      return;
    }

    if (!form.roleId) {
      showToast("error", "Pick a role");
      return;
    }

    if (phoneError) {
      showToast("error", phoneError);
      return;
    }

    if (form.password.length < 6) {
      showToast("error", "Password must be at least 6 characters");
      return;
    }

    if (form.password !== form.confirm) {
      showToast("error", "The two passwords do not match");
      return;
    }

    setSaving(true);

    try {
      const { data } = await axios.post("/api/users/create", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        roleId: form.roleId,
        password: form.password,
      });

      if (!data.success) {
        showToast("error", data.message || "Could not create the user");
        return;
      }

      showToast("success", `${form.name} can now sign in`);
      router.push(ADMIN_USERS);
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || "Could not create the user",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b">
          <h4 className="text-xl font-semibold">New User</h4>
          <p className="text-sm text-muted-foreground">
            A staff login for the admin panel and POS. Dealer and wholesaler
            logins are made on the Dealers &amp; Wholesalers page.
          </p>
        </CardHeader>

        <CardContent className="px-3 py-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="user-name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="user-name"
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-phone">Mobile Number</Label>
              <Input
                id="user-phone"
                value={form.phone}
                onChange={(e) => set({ phone: e.target.value })}
                placeholder="01712345678"
              />
              {phoneError ? (
                <p className="text-xs text-destructive">{phoneError}</p>
              ) : (
                form.phone &&
                bdOperator(form.phone) && (
                  <p className="text-xs text-muted-foreground">
                    {bdOperator(form.phone)}
                  </p>
                )
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="user-email">
                Email (login) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(e) => set({ email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-role">
                Role <span className="text-destructive">*</span>
              </Label>
              <select
                id="user-role"
                className={selectClass}
                value={form.roleId}
                onChange={(e) => set({ roleId: e.target.value })}
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role._id} value={role._id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                What this login may do. Roles are set on the Roles page.
              </p>
            </div>
          </div>

          {showrooms.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="user-showroom">Showroom</Label>
              <select
                id="user-showroom"
                className={selectClass}
                value={form.showroomId}
                onChange={(e) => set({ showroomId: e.target.value })}
              >
                <option value="">Head office / all</option>
                {showrooms.map((showroom) => (
                  <option key={showroom._id} value={showroom._id}>
                    {showroom.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="user-password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="user-password"
                type="password"
                value={form.password}
                onChange={(e) => set({ password: e.target.value })}
                placeholder="At least 6 characters"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-confirm">
                Confirm Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="user-confirm"
                type="password"
                value={form.confirm}
                onChange={(e) => set({ confirm: e.target.value })}
              />
              {form.confirm && form.confirm !== form.password && (
                <p className="text-xs text-destructive">
                  The two passwords do not match
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push(ADMIN_USERS)}>
          Cancel
        </Button>

        <Button onClick={save} disabled={saving}>
          <FiSave className="mr-2" />
          {saving ? "Saving..." : "Create User"}
        </Button>
      </div>
    </div>
  );
};

export default CreateUserPage;
