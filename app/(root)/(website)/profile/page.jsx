"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import Dropzone from "react-dropzone";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FaCamera } from "react-icons/fa";

import UserPanelLayout from "@/components/ui/Application/website/UserPannelLayout";
import Breadcums from "@/components/ui/Application/Admin/Breadcums";
import useFetch from "@/hooks/useFetch";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zSchema } from "@/lib/zodschema";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";

import userIcon from "@/public/assets/user.png";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

import { showToast } from "@/lib/showToast";
import { login } from "@/store/reducer/authReducer";
import { useState as useReactState } from "react";

const breadCrumbData = [{ label: "Home", href: "/" }, { label: "Profile" }];

const formSchema = zSchema.pick({
  name: true,
  address: true,
  phone: true,
  city: true,
  showroomId: true,
});

const Page = () => {
  const dispatch = useDispatch();
  const { data: user } = useFetch("/api/profile/get");

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      city: "",
      showroomId: "",
    },
  });

  useEffect(() => {
    if (user?.success) {
      const userData = user.data || {};

      form.reset({
        name: userData.name || "",
        phone: userData.phone || "",
        address: userData.address || "",
        city: userData.city || "",
        showroomId: userData.showroomId || "",
      });

      setPreview(userData?.avatar?.url || "");
    }
  }, [user, form]);

  const handleFileSelection = (files) => {
    const selectedFile = files?.[0];
    if (!selectedFile) return;

    const previewUrl = URL.createObjectURL(selectedFile);
    setPreview(previewUrl);
    setFile(selectedFile);
  };

  const updateProfile = async (values) => {
    setLoading(true);

    try {
      const formData = new FormData();

      if (file) {
        formData.set("file", file);
      }

      formData.set("name", values.name);
      formData.set("phone", values.phone);
      formData.set("address", values.address);
      formData.set("city", values.city);
      formData.set("showroomId", values.showroomId);

      const { data: response } = await axios.put(
        "/api/profile/update",
        formData,
      );

      if (!response.success) {
        throw new Error(response.message);
      }

      showToast("success", response.message);

      dispatch(login(response.data));
    } catch (error) {
      showToast("error", error?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserPanelLayout>
      <div className="mb-4">
        <Breadcums items={breadCrumbData} />
      </div>

      <div className="rounded shadow">
        <div className="border-b p-5 text-xl font-semibold">Profile</div>

        <div className="p-5">
          <Form {...form}>
            <form
              className="grid grid-cols-1 gap-5 md:grid-cols-2"
              onSubmit={form.handleSubmit(updateProfile)}
            >
              {/* Avatar */}
              <div className="col-span-1 flex items-center justify-center md:col-span-2">
                <Dropzone
                  onDrop={handleFileSelection}
                  multiple={false}
                  accept={{
                    "image/*": [".jpg", ".jpeg", ".png", ".webp"],
                  }}
                >
                  {({ getRootProps, getInputProps }) => (
                    <div {...getRootProps()} className="cursor-pointer">
                      <input {...getInputProps()} />

                      <Avatar className="group relative h-28 w-28 border">
                        <AvatarImage src={preview || userIcon.src} />

                        <div className="absolute inset-0 hidden items-center justify-center rounded-full bg-black/50 group-hover:flex">
                          <FaCamera color="#7c3aed" />
                        </div>
                      </Avatar>
                    </div>
                  )}
                </Dropzone>
              </div>

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Address */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="rounded-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* City */}
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>City / District</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Showroom ID */}
              <FormField
                control={form.control}
                name="showroomId"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Showroom ID</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="rounded-none"
                        placeholder="Showroom ID"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit */}
              <div className="md:col-span-2">
                <ButtonLoading
                  loading={loading}
                  type="submit"
                  text="Save Changes"
                  className="w-full"
                />
              </div>
            </form>
          </Form>
        </div>
      </div>
    </UserPanelLayout>
  );
};

export default Page;
