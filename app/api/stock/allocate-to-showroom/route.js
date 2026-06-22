import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";

import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";

export async function POST(req) {
  await connectDB();

  const { showroomId, productId, variantId, qty } = await req.json();
  const quantity = Number(qty);

  if (!quantity || quantity <= 0) {
    return Response.json(
      {
        success: false,
        message: "Invalid qty",
      },
      { status: 400 },
    );
  }

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const warehouse = await WarehouseStock.findOneAndUpdate(
        {
          productId,
          variantId,
          stock: { $gte: quantity },
        },
        {
          $inc: { stock: -quantity },
        },
        {
          new: true,
          session,
        },
      );

      if (!warehouse) {
        throw new Error("Insufficient warehouse stock");
      }

      const showroom = await ShowroomStock.findOneAndUpdate(
        {
          showroomId,
          productId,
          variantId,
        },
        {
          $inc: { stock: quantity },
        },
        {
          new: true,
          upsert: true,
          session,
        },
      );

      await session.commitTransaction();
      session.endSession();

      return Response.json({
        success: true,
        message: "Stock transferred successfully",
        data: showroom,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      const retryable =
        error?.errorLabels?.includes("TransientTransactionError") ||
        error?.errorLabels?.includes("UnknownTransactionCommitResult");

      if (retryable && attempt < MAX_RETRIES) {
        console.log(`Retrying transaction (${attempt})`);
        continue;
      }

      console.error("Transaction error:", error);

      return Response.json(
        {
          success: false,
          message: error.message,
        },
        { status: 400 },
      );
    }
  }

  return Response.json(
    {
      success: false,
      message: "Transaction failed after retries",
    },
    { status: 500 },
  );
}
