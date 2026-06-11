import { connectDB } from "@/lib/databaseconnection";
import { sendToCourier } from "@/lib/courierService";
import Order from "@/models/Order.model";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { orderIds, courierId } = body;

    console.log("🔥 DISPATCH API HIT");
    console.log("BODY:", body);

    if (!orderIds?.length) {
      return Response.json(
        {
          success: false,
          message: "No orders selected",
        },
        { status: 400 },
      );
    }

    if (!courierId) {
      return Response.json(
        {
          success: false,
          message: "Courier not selected",
        },
        { status: 400 },
      );
    }

    const orders = await Order.find({
      _id: { $in: orderIds },
    });

    if (!orders.length) {
      return Response.json(
        {
          success: false,
          message: "Orders not found",
        },
        { status: 404 },
      );
    }

    const results = [];

    for (const order of orders) {
      try {
        console.log("📦 Sending:", order.orderNumber);

        const result = await sendToCourier(courierId, order);

        console.log("✅ Courier Response:", JSON.stringify(result, null, 2));

        // Create payment if not exists
        if (!order.payments || order.payments.length === 0) {
          order.payments = [
            {
              method: "cod",
              amount: order.total || 0,
              courier: {},
            },
          ];
        }

        // Steadfast response data
        const courierData =
          result?.consignment || result?.data?.consignment || {};

        console.log("📦 Courier Data:", JSON.stringify(courierData, null, 2));

        order.status = "shipped";

        order.payments[0].courier = {
          status: "created",

          trackingCode: String(courierData?.tracking_code || ""),

          consignmentId: String(courierData?.consignment_id || ""),
        };

        console.log("💾 Saving Courier:", order.payments[0].courier);

        await order.save();

        results.push({
          orderId: order._id,
          success: true,
          courier: order.payments[0].courier,
        });
      } catch (err) {
        console.error("❌ Courier Error:", err);

        results.push({
          orderId: order._id,
          success: false,
          error: err.message,
        });
      }
    }

    const allSuccess = results.every((r) => r.success);

    return Response.json({
      success: allSuccess,
      message: allSuccess ? "Courier dispatch completed" : "Some orders failed",
      results,
    });
  } catch (error) {
    console.error("💥 Courier Dispatch Error:", error);

    return Response.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}
