import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import Posorder from "@/models/posorder.model";
import ShowroomStock from "@/models/ShowroomStock";
import { getNextInvoiceNumber } from "@/lib/getNextOrderNumber";

export async function POST(req) {
  const session = await mongoose.startSession();

  try {
    await connectDB();
    session.startTransaction();

    const body = await req.json();

    const {
      showroomId,
      originalOrderId,
      reason,
      returnedItems,
      newItems,
      createdBy,
    } = body;

    // =========================
    // VALIDATION
    // =========================
    if (!originalOrderId) throw new Error("Original order required");
    if (!showroomId) throw new Error("Showroom required");

    // =========================
    // GET ORIGINAL ORDER
    // =========================
    const originalOrder =
      await Posorder.findById(originalOrderId).session(session);

    if (!originalOrder) {
      throw new Error("Original order not found");
    }

    // =========================
    // 1. RETURN OLD ITEMS (STOCK +)
    // =========================
    for (const item of returnedItems) {
      await ShowroomStock.updateOne(
        {
          showroomId,
          productId: item.productId,
          variantId: item.variantId,
        },
        {
          $inc: { stock: item.qty },
        },
        { session },
      );
    }

    // =========================
    // 2. DEDUCT NEW ITEMS (STOCK -)
    // =========================
    for (const item of newItems) {
      const stockDoc = await ShowroomStock.findOne({
        showroomId,
        productId: item.productId,
        variantId: item.variantId,
      }).session(session);

      if (!stockDoc || stockDoc.stock < item.qty) {
        throw new Error("Insufficient stock for exchange item");
      }

      await ShowroomStock.updateOne(
        {
          showroomId,
          productId: item.productId,
          variantId: item.variantId,
        },
        {
          $inc: { stock: -item.qty },
        },
        { session },
      );
    }

    // =========================
    // CALCULATE AMOUNT DIFFERENCE
    // =========================
    const returnedTotal = returnedItems.reduce((sum, i) => sum + i.subtotal, 0);

    const newTotal = newItems.reduce((sum, i) => sum + i.subtotal, 0);

    const difference = newTotal - returnedTotal;

    // =========================
    // GENERATE EXCHANGE INVOICE
    // =========================
    const seq = await getNextInvoiceNumber("exchange_invoice");

    const exchangeNumber = `EXC-${String(seq).padStart(6, "0")}`;

    // =========================
    // SAVE EXCHANGE ORDER
    // =========================
    const exchangeOrder = await Posorder.create(
      [
        {
          orderNumber: exchangeNumber,
          showroomId,
          userId: createdBy || null,
          orderType: "exchange",

          items: newItems,

          exchange: {
            isExchange: true,
            originalOrderId,
            reason,
            returnedItems,
            newItems,
            refundAmount: difference < 0 ? Math.abs(difference) : 0,
            extraPaid: difference > 0 ? difference : 0,
            exchangeDate: new Date(),
            processedBy: createdBy || null,
          },

          total: newTotal,
          paymentMethod: difference > 0 ? "cash" : "adjusted",
          status: "completed",
        },
      ],
      { session },
    );

    // =========================
    // COMMIT TRANSACTION
    // =========================
    await session.commitTransaction();
    session.endSession();

    return Response.json({
      success: true,
      message: "Exchange completed successfully",
      exchangeOrder: exchangeOrder[0],
      difference,
    });
  } catch (error) {
    await session.abortTransaction().catch(() => {});
    session.endSession();

    return Response.json(
      {
        success: false,
        message: error.message,
      },
      { status: 400 },
    );
  }
}
