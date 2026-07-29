import mongoose from "mongoose";
import ShowroomStock from "@/models/ShowroomStock";
import Posorder from "@/models/posorder.model";
import { getNextInvoiceNumber } from "@/lib/getNextOrderNumber";
import { connectDB } from "@/lib/databaseconnection";
import { NextResponse } from "next/server";
import Customer from "@/models/Customer.model";
/* =========================
   GET ORDER
========================= */
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber");

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, message: "Missing orderNumber" },
        { status: 400 },
      );
    }

    let order;

    if (orderNumber.startsWith("INV-")) {
      order = await Posorder.findOne({ orderNumber });
    } else {
      order = await Posorder.findById(orderNumber);
    }

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/* =========================
   POST ORDER (FINAL FIXED)
========================= */
export async function POST(req) {
  await connectDB();

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const body = await req.json();

    const {
      items,
      total,
      subTotal,
      discount,
      vat,
      payments,
      deliveryCharge,
      remark,
      showroomId,
      createdBy,
      soldBy,
      customerName,
      phone,
      address,
      saleDate,
      isExchangeMode,
    } = body;

    /* =========================
       VALIDATION
    ========================= */
    if (!items?.length) throw new Error("Cart is empty");
    if (!showroomId) throw new Error("Showroom required");

    const seq = await getNextInvoiceNumber("pos_invoice");
    const orderNumber = `INV-${String(seq).padStart(6, "0")}`;

    /* =========================
       CUSTOMER CREATE / UPDATE
    ========================= */

    let customer = null;

    if (phone?.trim()) {
      customer = await Customer.findOne({ phone }).session(session);

      if (customer) {
        customer.name = customerName || customer.name;
        customer.address = address || customer.address;
        customer.totalOrders += 1;
        customer.totalSpent += Number(total || 0);

        await customer.save({ session });
      } else {
        customer = await Customer.create(
          [
            {
              name: customerName || "Walk In Customer",
              phone,
              address,
              totalOrders: 1,
              totalSpent: Number(total || 0),
            },
          ],
          { session },
        );

        customer = customer[0];
      }
    }

    /* =========================
       CLEAN PAYMENTS
    ========================= */

    const cleanPayments =
      payments?.length > 0
        ? payments.map((p) => ({
            type: p.type,
            option: p.option || "",
            amount: Number(p.amount),
          }))
        : [
            {
              type: "Cash",
              option: "",
              amount: Number(total),
            },
          ];

    /* =========================
       STOCK UPDATE
    ========================= */

    for (const item of items) {
      const stockDoc = await ShowroomStock.findOne({
        showroomId,
        productId: item.productId,
        variantId: item.variantId,
      }).session(session);

      if (!stockDoc) {
        throw new Error(`Stock not found for product ${item.productId}`);
      }

      const update =
        stockDoc.stock !== undefined
          ? { stock: -item.qty }
          : { showroomStock: -item.qty };

      await ShowroomStock.updateOne(
        {
          showroomId,
          productId: item.productId,
          variantId: item.variantId,
        },
        {
          $inc: update,
        },
        {
          session,
        },
      );
    }

    /* =========================
       ORDER DATA
    ========================= */

    const orderData = {
      orderNumber,

      customerId: customer?._id || null,

      items,

      total,
      subTotal: subTotal || total,
      discount: discount || 0,
      vat: vat || 0,

      payments: cleanPayments,

      deliveryCharge: deliveryCharge || 0,

      remark,

      soldBy: soldBy || "Counter Guest",

      customerName,
      phone,
      address,

      saleDate,

      showroomId,

      userId: createdBy || null,

      exchange: {
        isExchange: isExchangeMode || false,
        reason: "",
        returnedItems: [],
        newItems: [],
        refundAmount: 0,
        extraPaid: 0,
        exchangeDate: new Date(),
        processedBy: createdBy || null,
      },

      status: "completed",

      orderType: isExchangeMode ? "exchange" : "pos",

      createdAt: new Date(),
    };

    const order = await Posorder.create([orderData], {
      session,
    });

    await session.commitTransaction();

    session.endSession();

    return NextResponse.json({
      success: true,
      message: isExchangeMode
        ? "Exchange completed successfully"
        : "Order created successfully",
      order: order[0],
      customer,
    });
  } catch (error) {
    console.error(error);

    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    session.endSession();

    return NextResponse.json(
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
