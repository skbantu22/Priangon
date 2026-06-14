// app/api/pos/showroom-orders/route.js
import mongoose from "mongoose";
import ShowroomStock from "@/models/ShowroomStock";
import Posorder from "@/models/posorder.model";
import { getNextInvoiceNumber } from "@/lib/getNextOrderNumber";
import { connectDB } from "@/lib/databaseconnection";
import { NextResponse } from "next/server"; // ✅ Added missing import

export async function GET(req) {
  try {
    await connectDB();

    // 1. Extract query parameters from the request URL
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber");

    console.log("QUERY ORDER NUMBER RECEIVED:", orderNumber);

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, message: "Missing orderNumber query parameter" },
        { status: 400 },
      );
    }

    let order = null;

    // 2. Query the database using the correctly named Posorder model
    if (orderNumber.startsWith("INV-")) {
      console.log("Searching database by orderNumber string property...");
      order = await Posorder.findOne({ orderNumber: orderNumber }); // ✅ Fixed Model Reference
    } else {
      console.log("Searching database by Document ObjectId key...");
      order = await Posorder.findById(orderNumber); // ✅ Fixed Model Reference
    }

    console.log("ORDER RECORD FOUND:", order);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: `Order record not found for identifier: ${orderNumber}`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.log("PRINT API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}
export async function POST(req) {
  // Always connect to the database before managing sessions
  try {
    await connectDB();
  } catch (dbError) {
    console.error("❌ DATABASE CONNECTION ERROR:", dbError);
    return Response.json(
      { success: false, message: "Database connection failed" },
      { status: 500 },
    );
  }

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
      soldBy, // Parsed from frontend payload
      customerName,
      phone,
      address,
      saleDate,
      isExchangeMode,
    } = body;

    // =========================
    // VALIDATION
    // =========================
    if (!items?.length) throw new Error("Cart is empty");
    if (!showroomId) throw new Error("Showroom ID required");

    const seq = await getNextInvoiceNumber("pos_invoice");
    const orderNumber = `INV-${String(seq).padStart(6, "0")}`;

    // =========================
    // STOCK UPDATE
    // =========================
    for (const item of items) {
      if (!item.variantId || !item.productId) {
        throw new Error(
          "Invalid item structure: missing variantId or productId",
        );
      }

      const variantId = new mongoose.Types.ObjectId(item.variantId);
      const productId = new mongoose.Types.ObjectId(item.productId);

      const stockDoc = await ShowroomStock.findOne({
        showroomId,
        productId,
        variantId,
      }).session(session);

      if (!stockDoc) {
        throw new Error(
          `Stock record not found for variant ID: ${item.variantId}`,
        );
      }

      // Check which key name your database schema uses ('stock' vs 'showroomStock')
      const isLegacyStockField = stockDoc.stock !== undefined;
      const currentStock = isLegacyStockField
        ? stockDoc.stock
        : stockDoc.showroomStock;

      if (currentStock < item.qty) {
        throw new Error(
          `Insufficient stock. Available: ${currentStock}, Requested: ${item.qty}`,
        );
      }

      // ✅ FIX: Target the correct operational property dynamically
      const updatePayload = isLegacyStockField
        ? { stock: -item.qty }
        : { showroomStock: -item.qty };

      await ShowroomStock.updateOne(
        { showroomId, productId, variantId },
        { $inc: updatePayload },
        { session },
      );
    }

    // =========================
    // CREATE ORDER (FULL DATA)
    // =========================
    const order = await Posorder.create(
      [
        {
          orderNumber,
          items,
          total,
          subTotal: subTotal || total,
          discount: discount || 0,
          vat: vat || 0,
          payments,
          deliveryCharge: deliveryCharge || 0,
          remark,
          soldBy: soldBy || "Counter Guest", // ✅ Fallback applied cleanly if form field is empty
          customerName,
          phone,
          address,
          saleDate,
          showroomId,
          userId: createdBy || null,
          isExchangeMode: isExchangeMode || false,
          status: "completed",
          createdAt: new Date(),
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return Response.json({
      success: true,
      message: isExchangeMode
        ? "Exchange completed successfully"
        : "Order created successfully",
      order: order[0],
    });
  } catch (error) {
    console.log("❌ ORDER PROCESSING ERROR:", error);

    // Safely abort if active transaction exists
    if (session.inTransaction()) {
      await session.abortTransaction().catch(() => {});
    }
    session.endSession();

    return Response.json(
      {
        success: false,
        message: error.message || "An unexpected transaction error occurred",
      },
      { status: 400 },
    );
  }
}
