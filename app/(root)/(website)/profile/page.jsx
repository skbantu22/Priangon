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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zSchema } from "@/lib/zodschema";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";
import { Textarea } from "@/components/ui/textarea";
import userIcon from "@/public/assets/user.png";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { showToast } from "@/lib/showToast";
import { login } from "@/store/reducer/authReducer";

const breadCrumbData = [
  { label: "Home", href: "/" },
  { label: "Profile" },
];

const formSchema = zSchema.pick({
  name: true,
  address: true,
  phone: true,
  city: true,


});

const Page = () => {
  const dispatch = useDispatch();
  const { data: user } = useFetch("/api/profile/get");
console.log(user)
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


    },
  });

  useEffect(() => {
    if (user?.success) {
      const userData = user.data;

      form.reset({
        name: userData?.name || "",
        phone: userData?.phone || "",
        address: userData?.address || "",
        city: userData?.city || "",
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


      const { data: response } = await axios.put("/api/profile/update", formData);

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
    <div>
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

                        <Avatar className="group relative h-28 w-28 border border-gray-100">
                          <AvatarImage src={preview ? preview : userIcon.src} />

                          <div className="absolute left-1/2 top-1/2 z-50 hidden h-full w-full -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-violet-500 bg-black/50 group-hover:flex">
                            <FaCamera color="#7c3aed" />
                          </div>
                        </Avatar>
                      </div>
                    )}
                  </Dropzone>
                </div>

                <div className="mb-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            className="rounded-none"
                            placeholder="Enter your name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mb-3">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input
                            className="rounded-none"
                            placeholder="Enter your phone"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mb-3 md:col-span-2">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea
                            className="rounded-none"
                            placeholder="Enter your address"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                    <div className="mb-3 md:col-span-2">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City /District </FormLabel>
                        <FormControl>
                          <Input
                            className="rounded-none"
                            placeholder="Enter City"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-1 mb-3 md:col-span-2">
                  <ButtonLoading
                    loading={loading}
                    type="submit"
                    text="Save Changes"
                    className="cursor-pointer"
                  />
                </div>
              </form>
            </Form>
          </div>
        </div>
      </UserPanelLayout>
    </div>
  );
};

export default Page;