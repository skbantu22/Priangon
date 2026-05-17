import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";

import Posorder from "@/models/posorder.model";
import ShowroomProductVariant from "@/models/ShowroomProductVariant.model";

export async function POST(req) {
  const session = await mongoose.startSession();

  try {
    await connectDB();

    session.startTransaction();

    const body = await req.json();

    const { items, total, paymentMethod, showroomId, orderType, userId } = body;

    // ---------------- VALIDATION ----------------
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Cart is empty");
    }

    if (!showroomId) {
      throw new Error("Showroom ID required");
    }

    if (!total || total <= 0) {
      throw new Error("Invalid total");
    }

    // ---------------- ORDER NUMBER ----------------
    const orderNumber =
      "POS-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

    // ---------------- STOCK CHECK + DEDUCT ----------------
    for (const item of items) {
      if (!item.variantId) {
        throw new Error(`Variant ID missing for ${item.name || "product"}`);
      }

      if (!item.qty || item.qty <= 0) {
        throw new Error(`Invalid quantity`);
      }

      const updated = await ShowroomProductVariant.updateOne(
        {
          showroomId,
          variants: {
            $elemMatch: {
              variantId: item.variantId,
              stock: { $gte: item.qty },
            },
          },
        },
        {
          $inc: {
            "variants.$.stock": -item.qty,
          },
        },
        { session },
      );

      if (updated.modifiedCount === 0) {
        throw new Error(
          `Insufficient stock for ${item.name || item.variantId}`,
        );
      }
    }

    // ---------------- CREATE ORDER ----------------
    const createdOrders = await Posorder.create(
      [
        {
          orderNumber,

          showroomId,

          userId: userId || null,

          orderType: orderType || "pos",

          paymentMethod: paymentMethod || "cash",

          status: "delivered",

          total,

          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || null,

            // IMPORTANT FOR THERMAL PRINT
            name: item.name,

            qty: item.qty,
            price: item.price,
          })),

          createdAt: new Date(),
        },
      ],
      { session },
    );

    const order = createdOrders[0];

    // ---------------- COMMIT ----------------
    await session.commitTransaction();

    return Response.json(
      {
        success: true,
        message: "POS order created successfully",
        order,
      },
      { status: 201 },
    );
  } catch (error) {
    await session.abortTransaction();

    console.error("❌ POS ORDER ERROR");
    console.error(error);

    return Response.json(
      {
        success: false,
        message: error.message || "Server Error",
      },
      { status: 400 },
    );
  } finally {
    session.endSession();
  }
}
