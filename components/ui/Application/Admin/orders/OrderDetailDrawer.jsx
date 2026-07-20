"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  X,
  MapPin,
  Phone,
  User,
  CreditCard,
  Save,
  Loader2,
  FileText,
  Edit3,
  XCircle,
  Trash2,
  ImagePlus,
} from "lucide-react";

import UploadMedia from "@/components/ui/Application/Admin/uploadmedia";
import MediaModal from "@/components/ui/Application/Admin/MediaModel";
import { useQueryClient } from "@tanstack/react-query";

const OrderDetailDrawer = ({ order, onClose }) => {
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [transactionNumber, setTransactionNumber] = useState("");
  const [paymentImage, setPaymentImage] = useState("");
  const [note, setNote] = useState("");

  const [openMedia, setOpenMedia] = useState(false);

  useEffect(() => {
    if (!order) return;

    setTransactionNumber(order?.payment?.transactionNumber || "");
    setPaymentImage(order?.payment?.paymentImage || "");
    setNote(order?.note || "");
    setIsEditing(false);
  }, [order]);

  if (!order) return null;

  const handleCancelEdit = () => {
    setTransactionNumber(order?.payment?.transactionNumber || "");
    setPaymentImage(order?.payment?.paymentImage || "");
    setNote(order?.note || "");
    setIsEditing(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.patch(`/api/order/update/${order._id}`, {
        payment: {
          transactionNumber,
          paymentImage,
        },
        note,
      });

      setIsEditing(false);
    } catch (err) {
      console.log(err);
      alert("Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center px-5 py-4 border-b bg-gray-50">
          <div>
            <p className="text-xs text-gray-400">ORDER</p>
            <h2 className="text-lg font-bold">#{order.orderNumber}</h2>
          </div>

          <div className="flex gap-2">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)}>
                <Edit3 className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button onClick={handleCancelEdit}>
                  <XCircle className="w-4 h-4 text-red-500" />
                </button>

                <button onClick={handleSave} disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </button>
              </>
            )}

            <button onClick={onClose}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* CUSTOMER */}
          <div className="border rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <User className="w-4 h-4 text-indigo-500" />
              {order.customer?.name}
            </div>
            <div className="text-sm text-gray-500">
              <Phone className="w-4 h-4 inline mr-1" />
              {order.customer?.phone}
            </div>
            <div className="text-sm text-gray-500">
              <MapPin className="w-4 h-4 inline mr-1" />
              {order.customer?.address}
            </div>
          </div>

          {/* PRODUCTS */}
          <div className="border rounded-2xl p-4 space-y-4">
            <div className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              Products
            </div>
            <div className="space-y-3">
              {order?.items?.map((item, index) => {
                console.log("ORDER ITEM DATA:", item);

                console.log("PRICE CHECK:", {
                  variantSellingPrice: item?.variantId?.sellingPrice,
                  itemPrice: item?.price,
                  sellingPrice: item?.sellingPrice,
                  unitPrice: item?.unitPrice,
                  mrp: item?.mrp,
                });

                return (
                  <div key={index} className="flex gap-4 p-3 border rounded-xl">
                    {/* IMAGE */}
                    <img
                      src={
                        item?.variantId?.media?.[0]?.url ||
                        item?.productId?.media?.[0]?.url ||
                        item?.media ||
                        "/placeholder-product.png"
                      }
                      alt={item?.name || "product"}
                      className="w-20 h-20 rounded-xl object-cover border"
                    />

                    {/* DETAILS */}
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {item?.productId?.name || item?.name || "Product"}
                      </h3>

                      <div className="text-sm text-gray-500 mt-2 space-y-1">
                        <p>
                          Variant:{" "}
                          {item?.variantId?.color || item?.color || "N/A"}
                        </p>

                        <p>
                          Size: {item?.variantId?.size || item?.size || "N/A"}
                        </p>

                        <p>Quantity: {item?.quantity || 1}</p>

                        <p className="font-semibold text-black">
                          Price: ৳
                          {item?.variantId?.sellingPrice ??
                            item?.sellingPrice ??
                            item?.unitPrice ??
                            item?.price ??
                            0}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* PAYMENT */}
          <div className="border rounded-2xl p-4 space-y-4">
            <div className="font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-500" />
              Payment
            </div>

            {/* Transaction */}
            <div>
              <p className="text-xs text-gray-400">Transaction ID</p>

              {isEditing ? (
                <input
                  className="w-full px-3 py-2 border rounded-lg"
                  value={transactionNumber}
                  onChange={(e) => setTransactionNumber(e.target.value)}
                />
              ) : (
                <p className="font-medium">
                  {order.payment?.transactionNumber || "N/A"}
                </p>
              )}
            </div>

            {/* IMAGE CARD (NO URL SHOW) */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Payment Screenshot</p>

              {isEditing ? (
                <div className="space-y-3">
                  {/* Upload */}
                  <UploadMedia
                    isMultiple={false}
                    queryClient={queryClient}
                    onSelect={(media) => {
                      const url = media?.[0]?.secure_url || media?.[0]?.url;
                      if (url) setPaymentImage(url);
                    }}
                  />

                  {/* Media Picker */}
                  <button
                    onClick={() => setOpenMedia(true)}
                    className="w-full py-2 text-xs border rounded hover:bg-black hover:text-white"
                  >
                    Choose from Media Library
                  </button>

                  {/* Preview Card */}
                  {paymentImage ? (
                    <div className="relative group">
                      <img
                        src={paymentImage}
                        className="w-full h-52 object-cover rounded-xl border"
                      />

                      {/* overlay actions */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3 rounded-xl">
                        <button
                          onClick={() => setPaymentImage("")}
                          className="p-2 bg-white rounded-full"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>

                        <label className="p-2 bg-white rounded-full cursor-pointer">
                          <ImagePlus className="w-4 h-4 text-black" />
                          <UploadMedia
                            isMultiple={false}
                            queryClient={queryClient}
                            onSelect={(media) => {
                              const url =
                                media?.[0]?.secure_url || media?.[0]?.url;
                              if (url) setPaymentImage(url);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center border rounded-xl text-gray-400">
                      No image selected
                    </div>
                  )}
                </div>
              ) : paymentImage ? (
                <img
                  src={paymentImage}
                  className="w-full h-52 object-cover rounded-xl border"
                />
              ) : (
                <p className="text-sm text-gray-400">No image</p>
              )}
            </div>
          </div>

          {/* NOTE */}
          <div className="border rounded-2xl p-4">
            <div className="flex items-center gap-2 font-semibold mb-2">
              <FileText className="w-4 h-4" />
              Note
            </div>

            {isEditing ? (
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            ) : (
              <p className="text-sm text-gray-600">
                {order.note || "No note available"}
              </p>
            )}
          </div>

          {/* TOTAL */}
          <div className="border rounded-2xl p-4 bg-gray-50">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{order.subtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>{order.shippingFee}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Discount</span>
              <span>-{order.discount}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total</span>
              <span className="text-green-600">{order.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MEDIA MODAL */}
      <MediaModal
        open={openMedia}
        setOpen={setOpenMedia}
        selectedMedia={[]}
        setSelectedMedia={(items) => {
          const url = items?.[0]?.secure_url || items?.[0]?.url;
          if (url) setPaymentImage(url);
        }}
        isMultiple={false}
      />
    </div>
  );
};

export default OrderDetailDrawer;
