import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import Posorder from "@/models/posorder.model";
import ShowroomStock from "@/models/ShowroomStock";

export async function POST(req) {
  const session = await mongoose.startSession();

  try {
    await connectDB();
    session.startTransaction();

    const body = await req.json();

    console.log("🧾 ORDER BODY:", JSON.stringify(body, null, 2));

    const { items, total, paymentMethod, showroomId, orderType, createdBy } =
      body;

    // =========================
    // VALIDATION
    // =========================
    if (!items?.length) throw new Error("Cart is empty");
    if (!showroomId) throw new Error("Showroom ID required");
    if (!total || total <= 0) throw new Error("Invalid total");

    const orderNumber =
      "ORD-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

    console.log("🧾 ORDER NUMBER:", orderNumber);

    // =========================
    // PROCESS ITEMS (STOCK REDUCTION)
    // =========================
    for (const item of items) {
      console.log("🔍 ITEM:", item);

      const variantId = new mongoose.Types.ObjectId(item.variantId);
      const productId = new mongoose.Types.ObjectId(item.productId);

      // =========================
      // STEP 1: FIND STOCK (FIXED QUERY)
      // =========================
      const stockDoc = await ShowroomStock.findOne({
        showroomId,
        productId,
        variantId,
      }).session(session);

      if (!stockDoc) {
        throw new Error(
          `Stock not found for product ${item.productId}, variant ${item.variantId}`,
        );
      }

      console.log("📦 CURRENT STOCK:", stockDoc.stock);

      // =========================
      // STEP 2: CHECK STOCK
      // =========================
      if (stockDoc.stock < item.qty) {
        throw new Error(`Insufficient stock for variant ${item.variantId}`);
      }

      // =========================
      // STEP 3: UPDATE STOCK (FIXED FIELD)
      // =========================
      const updateResult = await ShowroomStock.updateOne(
        {
          showroomId,
          productId,
          variantId,
          stock: { $gte: item.qty }, // safety lock
        },
        {
          $inc: {
            stock: -item.qty,
          },
        },
        { session },
      );

      console.log("📉 STOCK UPDATED:", updateResult);

      if (updateResult.modifiedCount === 0) {
        throw new Error("Failed to update stock (possible race condition)");
      }
    }

    // =========================
    // CREATE ORDER
    // =========================
    const order = await Posorder.create(
      [
        {
          orderNumber,
          items,
          total,
          paymentMethod: paymentMethod || "cash",
          showroomId,
          orderType: orderType || "pos",
          userId: createdBy || null,
          status: "delivered",
          createdAt: new Date(),
        },
      ],
      { session },
    );

    // =========================
    // COMMIT TRANSACTION
    // =========================
    await session.commitTransaction();
    session.endSession();

    console.log("✅ ORDER CREATED:", order[0]._id);

    return Response.json({
      success: true,
      message: "Order created successfully",
      order: order[0],
    });
  } catch (error) {
    await session.abortTransaction().catch(() => {});
    session.endSession();

    console.error("❌ ORDER ERROR:", error.message);

    return Response.json(
      {
        success: false,
        message: error.message,
      },
      { status: 400 },
    );
  }
}
