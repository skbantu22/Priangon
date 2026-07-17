import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import Posorder from "@/models/posorder.model";
import ShowroomStock from "@/models/ShowroomStock";
import { getNextInvoiceNumber } from "@/lib/getNextOrderNumber";

export async function POST(req) {
  await connectDB();

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const body = await req.json();

    const {
      showroomId,
      originalOrderId,
      reason,
      returnedItems,
      newItems,
      createdBy,
      payments,

      customerName = "Walk-in Customer",
      phone = "",
      address = "",
      saleDate = new Date(),
      soldBy = "",
      remark = "",
    } = body;

    // =========================
    // VALIDATION
    // =========================
    if (!originalOrderId) throw new Error("Original order required");
    if (!showroomId) throw new Error("Showroom required");
    if (!returnedItems?.length) throw new Error("Returned items required");
    if (!newItems?.length) throw new Error("New items required");

    // =========================
    // ORIGINAL ORDER
    // =========================
    const originalOrder =
      await Posorder.findById(originalOrderId).session(session);

    if (!originalOrder) {
      throw new Error("Original order not found");
    }

    // =========================
    // RETURN STOCK
    // =========================
    // =========================
    // RETURN STOCK (ANY SHOWROOM)
    // =========================
    for (const item of returnedItems) {
      let stockDoc = await ShowroomStock.findOne({
        showroomId,
        productId: item.productId,
        variantId: item.variantId,
      }).session(session);

      // যদি এই showroom-এ stock row না থাকে তাহলে create করো
      if (!stockDoc) {
        const created = await ShowroomStock.create(
          [
            {
              showroomId,
              productId: item.productId,
              variantId: item.variantId,
              stock: 0,
            },
          ],
          { session },
        );

        stockDoc = created[0];
      }

      await ShowroomStock.updateOne(
        {
          showroomId,
          productId: item.productId,
          variantId: item.variantId,
        },
        {
          $inc: {
            stock: Number(item.qty),
          },
        },
        { session },
      );
    }

    // =========================
    // DEDUCT NEW STOCK
    // =========================
    // =========================
    // DEDUCT NEW STOCK
    // =========================
    for (const item of newItems) {
      const stockDoc = await ShowroomStock.findOne({
        showroomId,
        productId: item.productId,
        variantId: item.variantId,
      }).session(session);

      if (!stockDoc) {
        throw new Error(
          `${item.productName || "Product"} stock not found in this showroom`,
        );
      }

      if (Number(stockDoc.stock) < Number(item.qty)) {
        throw new Error(
          `${item.productName || "Product"} only ${stockDoc.stock} pcs available`,
        );
      }

      await ShowroomStock.updateOne(
        {
          showroomId,
          productId: item.productId,
          variantId: item.variantId,
        },
        {
          $inc: {
            stock: -Number(item.qty),
          },
        },
        { session },
      );
    }

    // =========================
    // CALCULATE
    // =========================
    const returnedTotal = returnedItems.reduce(
      (sum, i) => sum + Number(i.subtotal || i.price * i.qty),
      0,
    );

    const newTotal = newItems.reduce(
      (sum, i) => sum + Number(i.subtotal || i.price * i.qty),
      0,
    );

    const difference = newTotal - returnedTotal;

    const payable = difference > 0 ? difference : 0;

    // =========================
    // PAYMENT ARRAY
    // =========================
    const cleanPayments =
      payable > 0
        ? payments?.length
          ? payments.map((p) => ({
              type: p.type,
              option: p.option || "",
              amount: Number(p.amount),
            }))
          : [
              {
                type: "Cash",
                option: "",
                amount: payable,
              },
            ]
        : [];

    // =========================
    // EXCHANGE NUMBER
    // =========================
    const seq = await getNextInvoiceNumber("exchange_invoice");

    const exchangeNumber = `EXC-${String(seq).padStart(6, "0")}`;

    // =========================
    // SAVE ORDER
    // =========================
    const exchangeOrder = await Posorder.create(
      [
        {
          orderNumber: exchangeNumber,

          // যে showroom থেকে exchange করা হচ্ছে
          showroomId,

          userId: createdBy || null,

          orderType: "exchange",

          status: "completed",

          items: newItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName || item.name || "Unknown Product",
            image: item.image || "",
            color: item.color || "",
            size: item.size || "",
            qty: Number(item.qty),
            price: Number(item.price),
            subtotal: Number(item.subtotal || item.price * item.qty),
          })),

          subTotal: newTotal,

          discount: 0,

          vat: 0,

          // Invoice total
          total: payable,

          payments: cleanPayments,

          customerName,
          phone,
          address,
          saleDate,
          soldBy,
          remark,

          exchange: {
            isExchange: true,

            originalOrderId,

            originalShowroomId: originalOrder.showroomId,

            exchangeShowroomId: showroomId,

            reason,

            returnedItems: returnedItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              productName: item.productName || item.name || "Unknown Product",
              image: item.image || "",
              color: item.color || "",
              size: item.size || "",
              qty: Number(item.qty),
              price: Number(item.price),
              subtotal: Number(item.subtotal || item.price * item.qty),
            })),

            newItems: newItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              productName: item.productName || item.name || "Unknown Product",
              image: item.image || "",
              color: item.color || "",
              size: item.size || "",
              qty: Number(item.qty),
              price: Number(item.price),
              subtotal: Number(item.subtotal || item.price * item.qty),
            })),

            returnedTotal,

            newTotal,

            difference,

            refundAmount: difference < 0 ? Math.abs(difference) : 0,

            extraPaid: difference > 0 ? difference : 0,

            exchangeDate: new Date(),

            processedBy: createdBy || null,
          },
        },
      ],
      { session },
    );

    await session.commitTransaction();

    session.endSession();

    return Response.json({
      success: true,
      message: "Exchange completed successfully",
      exchangeOrder: exchangeOrder[0],

      returnedTotal,
      newTotal,
      difference,

      refundAmount: difference < 0 ? Math.abs(difference) : 0,

      extraPaid: difference > 0 ? difference : 0,
    });
  } catch (error) {
    console.log(error);

    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    session.endSession();

    return Response.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 400,
      },
    );
  }
}
