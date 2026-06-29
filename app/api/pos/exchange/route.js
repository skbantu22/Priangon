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
      paymentMethod, // 💡 ফ্রন্টএন্ড থেকে পেমেন্ট মেথড পাস করলে রিসিভ করার ব্যবস্থা রাখা হলো
    } = body;

    // =========================
    // VALIDATION
    // =========================
    if (!originalOrderId) throw new Error("Original order required");
    if (!showroomId) throw new Error("Showroom required");
    if (!returnedItems || returnedItems.length === 0)
      throw new Error("Returned items required");
    if (!newItems || newItems.length === 0)
      throw new Error("New items required");

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
        throw new Error(
          `Insufficient stock for item: ${item.name || "Selected product"}`,
        );
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
    // আইটেমের subtotal বা price * qty হিসেবে সেফটি ক্যালকুলেশন
    const returnedTotal = returnedItems.reduce(
      (sum, i) => sum + (i.subtotal || i.price * i.qty),
      0,
    );
    const newTotal = newItems.reduce(
      (sum, i) => sum + (i.subtotal || i.price * i.qty),
      0,
    );

    const difference = newTotal - returnedTotal;

    // =========================
    // GENERATE EXCHANGE INVOICE
    // =========================
    const seq = await getNextInvoiceNumber("exchange_invoice");
    const exchangeNumber = `EXC-${String(seq).padStart(6, "0")}`;

    // =========================
    // SAVE EXCHANGE ORDER
    // =========================
    // 🛠️ মেইন ফিক্স: ফাইনাল পেয়েবল বা রিফান্ড অ্যামাউন্ট নির্ধারণ
    const finalPayableTotal = difference > 0 ? difference : 0;

    const exchangeOrder = await Posorder.create(
      [
        {
          orderNumber: exchangeNumber,
          showroomId,
          userId: createdBy || null,
          orderType: "exchange",

          items: newItems, // কাস্টমার এক্সচেঞ্জ করে এই আইটেমগুলো নিয়ে যাচ্ছে

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

          // 👑 ফিক্স: রসিদ যাতে ভুল প্রোডাক্ট প্রাইস না দেখায়, তাই নিট এক্সচেঞ্জ ভ্যালুকে আসল টোটাল করা হলো
          subTotal: newTotal,
          discount: 0,
          vat: 0,
          total: finalPayableTotal, // 👈 এটি রসিদে 'Grand Total' বা 'Payable Amount' দেখাবে (যেমন: ৫০০ বা ০)

          // যদি কাস্টমারকে এক্সট্রা পে করতে হয় তবে ফ্রন্টএন্ডের মেথড অথবা ক্যাশ, আর সমান বা কম হলে এডজাস্টেড
          paymentMethod: difference > 0 ? paymentMethod || "cash" : "adjusted",
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
    console.log(error);
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
