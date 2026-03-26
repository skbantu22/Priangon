"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/showToast";
import axios from "axios";
import { CldUploadWidget } from "next-cloudinary";

const UploadMedia = ({ isMultiple, queryClient }) => {
  const handleOnQueueEnd = async (results) => {
    const files = results.info.files;

    // Filter and format the uploaded file data
    const uploadedFiles = files
      .filter((file) => file.uploadInfo)
      .map((file) => ({
        asset_id: file.uploadInfo.asset_id,
        public_id: file.uploadInfo.public_id,
        secure_url: file.uploadInfo.secure_url,
        path: file.uploadInfo.path,
        thumbnail_url: file.uploadInfo.thumbnail_url,
      }));

    if (uploadedFiles.length > 0) {
      try {
        const { data: mediaUploadResponse } = await axios.post(
          "/api/media/create",
          uploadedFiles,
        );

        if (!mediaUploadResponse.success) {
          throw new Error(mediaUploadResponse.message);
        }

        // Refresh the media gallery data
        queryClient.invalidateQueries(["media-data"]);
        showToast("success", mediaUploadResponse.message);
      } catch (error) {
        showToast("error", error.message);
      }
    }
  };

  return (
    <CldUploadWidget
      signatureEndpoint="/api/auth/cloudinary-signature"
      uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
      options={{
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        multiple: isMultiple,
        // ✅ Essential for Mobile "Normal" feel:
        sources: ["local", "camera", "url"],
        inlineContainer: null, // Ensures it opens as a full-screen overlay
        clientAllowedFormats: ["png", "jpeg", "jpg", "webp"],
        maxFileSize: 5000000, // 5MB limit

        // UI Customization for mobile
        styles: {
          palette: {
            window: "#FFFFFF",
            sourceBg: "#F4F4F5",
            windowBorder: "#E4E4E7",
            tabIcon: "#000000",
            inactiveTabIcon: "#71717A",
            menuIcons: "#000000",
            link: "#000000",
            action: "#000000",
            inProgress: "#000000",
            complete: "#10B981",
            error: "#EF4444",
            textDark: "#000000",
            textLight: "#FFFFFF",
          },
        },
      }}
      onQueuesEnd={handleOnQueueEnd}
      onError={(error) => {
        console.error("Cloudinary error:", error);
        showToast("error", "Upload failed. Please try again.");
      }}
    >
      {({ open }) => (
        <Button
          type="button"
          className="w-full md:w-auto" // Full width on mobile for better touch targets
          onClick={(e) => {
            e.preventDefault();
            open();
          }}
        >
          Upload Image{isMultiple ? "s" : ""}
        </Button>
      )}
    </CldUploadWidget>
  );
};

export default UploadMedia;
