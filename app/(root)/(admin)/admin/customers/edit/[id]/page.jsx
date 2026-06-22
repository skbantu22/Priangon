"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { use } from "react";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";

import {
  ADMIN_CUSTOMERS_SHOW,
  ADMIN_DASHBOARD,
} from "@/Route/Adminpannelroute";
import { showToast } from "@/lib/showToast";
import useFetch from "@/hooks/useFetch";
import { z } from "zod";
import { useRouter } from "next/navigation";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_CUSTOMERS_SHOW, label: "Users" },
  { href: "#", label: "Edit User" },
];

export default function EditCustomer({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { data: userData } = useFetch(`/api/customers/get/${id}`);

  // 🔥 FULL USER SCHEMA
  const formSchema = z.object({
    _id: z.string(),

    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),

    role: z.enum(["customer", "cashier", "moderator", "manager", "admin"]),
    showroomId: z.string().optional(),

    isEmailVerified: z.boolean().optional(),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      _id: "",
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      role: "user",
      showroomId: "main",
      isEmailVerified: false,
    },
  });

  // 🔥 LOAD DATA
  useEffect(() => {
    if (userData?.success) {
      const user = userData.data;

      form.reset({
        _id: user._id,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
        role: user.role || "user",
        showroomId: user.showroomId || "main",
        isEmailVerified: user.isEmailVerified || false,
      });
    }
  }, [userData]);

  // 🔥 SUBMIT
  const onSubmit = async (values) => {
    setLoading(true);

    try {
      const { data } = await axios.put("/api/customers/update", values);

      if (!data.success) throw new Error(data.message);

      showToast("success", "User updated successfully");
      router.push(ADMIN_CUSTOMERS_SHOW);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card>
        <CardHeader>
          <h1 className="text-xl font-bold text-center">Edit User</h1>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid md:grid-cols-2 gap-4"
            >
              {/* NAME */}
              <FormField
                name="name"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* EMAIL */}
              <FormField
                name="email"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* PHONE */}
              <FormField
                name="phone"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* ROLE DROPDOWN */}
              <FormField
                name="role"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full border p-2 rounded">
                        <option value="customer">Customer</option>
                        <option value="cashier">Cashier</option>
                        <option value="moderator">Moderator</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* SHOWROOM */}
              <FormField
                name="showroomId"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Showroom</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full border p-2 rounded">
                        <option value="main">Main</option>
                        <option value="uttara">Uttara</option>
                        <option value="mirpur">Mirpur</option>
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* ADDRESS */}
              <FormField
                name="address"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* CITY */}
              <FormField
                name="city"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* VERIFIED */}
              <FormField
                name="isEmailVerified"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel>Verified</FormLabel>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  </FormItem>
                )}
              />

              {/* BUTTON */}
              <div className="md:col-span-2">
                <ButtonLoading
                  type="submit"
                  loading={loading}
                  text="Update User"
                  className="w-full"
                />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
