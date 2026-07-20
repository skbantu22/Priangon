import { NextResponse } from "next/server";

import ShowroomOrderRequest from "@/models/ShowroomOrderRequest.model";
import ShowroomStock from "@/models/ShowroomStock";
import WarehouseStock from "@/models/WarehouseStock.model";
import Order from "@/models/Order.model";

import { connectDB } from "@/lib/databaseconnection";

export async function PUT(req) {
  try {
    await connectDB();

    const { orderId, userId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "Order id required",
        },
        {
          status: 400,
        },
      );
    }

    const showroomOrder = await ShowroomOrderRequest.findById(orderId)
      .populate({
        path: "items.productId",
        select: "name media",
      })
      .populate({
        path: "items.variantId",
        select: "media color size sku",
      });
    if (!showroomOrder) {
      return NextResponse.json(
        {
          success: false,
          message: "Showroom order request not found",
        },
        {
          status: 404,
        },
      );
    }

    if (showroomOrder.status === "approved") {
      return NextResponse.json(
        {
          success: false,
          message: "Already approved",
        },
        {
          status: 400,
        },
      );
    }

    /*
    =====================================
    SHOWROOM -> WAREHOUSE RETURN
    =====================================
    */

    for (const item of showroomOrder.items) {
      const productId = item.productId?._id || item.productId;

      const variantId = item.variantId?._id || item.variantId;

      const qty = item.qty || item.quantity || 0;

      if (qty <= 0) continue;

      const showroomStock = await ShowroomStock.findOneAndUpdate(
        {
          showroomId: showroomOrder.showroomId?._id || showroomOrder.showroomId,

          productId,

          variantId,
        },
        {
          $inc: {
            stock: -qty,
          },
        },
        {
          new: true,
        },
      );

      if (!showroomStock) {
        throw new Error("Showroom stock not found");
      }

      await WarehouseStock.findOneAndUpdate(
        {
          productId,

          variantId,
        },
        {
          $inc: {
            stock: qty,
          },
        },
        {
          upsert: true,
          new: true,
        },
      );
    }

    /*
    ============================
    CREATE ORDER
    ============================
    */

    const createdBy = userId || showroomOrder.createdBy;

    if (!createdBy) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin user required for order creation",
        },
        {
          status: 400,
        },
      );
    }

    const orderItems = showroomOrder.items.map((item) => ({
      productId: item.productId._id,

      variantId: item.variantId?._id || null,

      name: item.productId?.name || item.productName || "",

      color: item.color || item.variantId?.color || "",

      size: item.size || item.variantId?.size || "",

      sellingPrice: item.price || item.sellingPrice || 0,

      quantity: item.qty || item.quantity || 1,

      media:
        item.productId?.media?.[0]?.secure_url ||
        item.variantId?.media?.[0]?.secure_url ||
        "",
    }));

    const order = await Order.create({
      createdBy,

      customer: showroomOrder.customer,

      items: orderItems,

      subtotal: showroomOrder.subtotal || showroomOrder.total || 0,

      shippingFee: showroomOrder.shippingFee || 0,

      total: showroomOrder.total || 0,

      paymentMethodSelected: showroomOrder.paymentMethodSelected || "cod",

      status: "processing",
    });

    /*
    ============================
    UPDATE REQUEST
    ============================
    */

    showroomOrder.status = "approved";

    showroomOrder.orderId = order._id;

    await showroomOrder.save();

    return NextResponse.json({
      success: true,

      message: "Approved, stock returned and order created",

      orderId: order._id,
    });
  } catch (error) {
    console.log("Approve Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      },
    );
  }
}
