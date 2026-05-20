"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/showToast";
import MediaModal from "@/components/ui/Application/Admin/MediaModel";
import { Loader2, Trash2, Edit3, ExternalLink } from "lucide-react";

const BannerManager = () => {
  const queryClient = useQueryClient();

  // Modal and UI State
  const [open, setOpen] = useState(false);
  const [mediaType, setMediaType] = useState(null);
  const [currentBanner, setCurrentBanner] = useState(null);

  // Form State
  const [pcMedia, setPcMedia] = useState([]);
  const [mobileMedia, setMobileMedia] = useState([]);
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [order, setOrder] = useState(0);

  // Fetch Banners
  const { data: bannersData, isLoading: isFetching } = useQuery({
    queryKey: ["banner"],
    queryFn: async () => {
      const res = await axios.get("/api/banner/get");
      return res.data.data;
    },
    refetchOnWindowFocus: false,
  });

  // Create / Update
  const saveBannerMutation = useMutation({
    mutationFn: async (banner) => {
      if (banner._id) {
        return await axios.put(`/api/banner/${banner._id}`, banner);
      } else {
        return await axios.post("/api/banner", banner);
      }
    },

    onSuccess: () => {
      showToast("success", currentBanner ? "Banner updated" : "Banner created");

      queryClient.invalidateQueries({
        queryKey: ["banner"],
      });

      resetForm();
    },

    onError: (err) => {
      console.error(err);
      showToast("error", "Failed to save banner");
    },
  });

  // Delete
  const deleteBannerMutation = useMutation({
    mutationFn: async (id) => {
      return await axios.delete(`/api/banner/${id}`);
    },

    onSuccess: () => {
      showToast("success", "Banner deleted successfully");

      queryClient.invalidateQueries({
        queryKey: ["banner"],
      });
    },

    onError: (err) => {
      console.error(err);
      showToast("error", "Delete failed");
    },
  });

  // Reset Form
  const resetForm = () => {
    setName("");
    setLink("");
    setOrder(0);
    setPcMedia([]);
    setMobileMedia([]);
    setCurrentBanner(null);
  };

  // Edit Banner
  const handleEdit = (banner) => {
    setCurrentBanner(banner);

    setName(banner.name || "");
    setLink(banner.link || "");
    setOrder(banner.order || 0);

    // SAFE MEDIA
    setPcMedia(banner.pcImage ? [banner.pcImage] : []);
    setMobileMedia(banner.mobileImage ? [banner.mobileImage] : []);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Delete Banner
  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this banner?")) {
      deleteBannerMutation.mutate(id);
    }
  };

  // Submit
  const handleSubmit = () => {
    const pcImage = pcMedia?.[0]?.url || pcMedia?.[0]?.secure_url || "";

    const mobileImage =
      mobileMedia?.[0]?.url || mobileMedia?.[0]?.secure_url || "";

    if (!name || !pcImage || !mobileImage) {
      return showToast("error", "Please fill name and select both images");
    }

    saveBannerMutation.mutate({
      _id: currentBanner?._id,
      name,
      link,
      order,
      pcImage: pcMedia[0],
      mobileImage: mobileMedia[0],
    });
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          {currentBanner ? "Edit Banner" : "Banner Manager"}
        </h2>

        {currentBanner && (
          <Button variant="outline" size="sm" onClick={resetForm}>
            Cancel Editing
          </Button>
        )}
      </div>

      {/* Form */}
      <div className="grid md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-md">
        <div className="space-y-1">
          <label className="text-sm font-medium">Banner Name</label>

          <input
            type="text"
            placeholder="e.g. Summer Sale"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border p-2 rounded bg-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Redirect Link</label>

          <input
            type="text"
            placeholder="https://..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="w-full border p-2 rounded bg-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Display Order</label>

          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            className="w-full border p-2 rounded bg-white"
          />
        </div>
      </div>

      {/* Image Selectors */}
      <div className="grid md:grid-cols-2 gap-6 mt-4">
        {/* PC Banner */}
        <div className="border border-dashed rounded-lg p-5 text-center space-y-4 bg-white">
          <h3 className="font-semibold text-gray-700">PC Banner (Wide)</h3>

          {pcMedia.length > 0 ? (
            <div className="relative mx-auto w-[240px] h-[120px]">
              {pcMedia?.[0]?.url || pcMedia?.[0]?.secure_url ? (
                <Image
                  src={pcMedia?.[0]?.url || pcMedia?.[0]?.secure_url}
                  fill
                  alt="pc preview"
                  className="object-cover rounded border"
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-100 rounded text-gray-400">
                  Invalid Image
                </div>
              )}
            </div>
          ) : (
            <div className="h-[120px] flex items-center justify-center bg-gray-100 rounded text-gray-400">
              No PC Image Selected
            </div>
          )}

          <Button
            variant="secondary"
            onClick={() => {
              setMediaType("pc");
              setOpen(true);
            }}
          >
            Choose PC Image
          </Button>
        </div>

        {/* Mobile Banner */}
        <div className="border border-dashed rounded-lg p-5 text-center space-y-4 bg-white">
          <h3 className="font-semibold text-gray-700">
            Mobile Banner (Square/Tall)
          </h3>

          {mobileMedia.length > 0 ? (
            <div className="relative mx-auto w-[120px] h-[120px]">
              {mobileMedia?.[0]?.url || mobileMedia?.[0]?.secure_url ? (
                <Image
                  src={mobileMedia?.[0]?.url || mobileMedia?.[0]?.secure_url}
                  fill
                  alt="mobile preview"
                  className="object-cover rounded border"
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-100 rounded text-gray-400">
                  Invalid Image
                </div>
              )}
            </div>
          ) : (
            <div className="h-[120px] flex items-center justify-center bg-gray-100 rounded text-gray-400">
              No Mobile Image Selected
            </div>
          )}

          <Button
            variant="secondary"
            onClick={() => {
              setMediaType("mobile");
              setOpen(true);
            }}
          >
            Choose Mobile Image
          </Button>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={handleSubmit}
          disabled={saveBannerMutation.isPending}
          className="px-8"
        >
          {saveBannerMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}

          {currentBanner ? "Update Banner" : "Save New Banner"}
        </Button>

        <Button variant="ghost" onClick={resetForm}>
          Reset Form
        </Button>
      </div>

      <hr className="my-8" />

      {/* Banner Table */}
      <div className="rounded-md border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Banner Info
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Previews
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Order
              </th>

              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {isFetching ? (
              <tr>
                <td colSpan="4" className="text-center py-10">
                  Loading banners...
                </td>
              </tr>
            ) : bannersData?.length > 0 ? (
              bannersData.map((banner) => (
                <tr
                  key={banner._id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Info */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {banner.name}
                    </div>

                    <div className="text-sm text-gray-500 truncate max-w-[200px]">
                      {banner.link}
                    </div>
                  </td>

                  {/* Images */}
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {/* PC */}
                      <div className="relative w-16 h-8 border rounded overflow-hidden bg-gray-100">
                        {banner?.pcImage?.secure_url ? (
                          <Image
                            src={banner.pcImage.secure_url}
                            fill
                            className="object-cover"
                            alt="pc"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                            No Image
                          </div>
                        )}
                      </div>

                      {/* Mobile */}
                      <div className="relative w-8 h-8 border rounded overflow-hidden bg-gray-100">
                        {banner?.mobileImage?.secure_url ? (
                          <Image
                            src={banner.mobileImage.secure_url}
                            fill
                            className="object-cover"
                            alt="mobile"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                            No Image
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Order */}
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {banner.order}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(banner)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(banner._id)}
                      disabled={deleteBannerMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    {banner.link && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(banner.link, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-10 text-gray-500">
                  No banners found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Media Modal */}
      <MediaModal
        open={open}
        setOpen={setOpen}
        selectedMedia={mediaType === "pc" ? pcMedia : mobileMedia}
        setSelectedMedia={mediaType === "pc" ? setPcMedia : setMobileMedia}
        isMultiple={false}
      />
    </div>
  );
};

export default BannerManager;
