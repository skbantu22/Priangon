import { connectDB } from "@/lib/databaseconnection";
import Order from "@/models/Order.model";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const trackingCode = searchParams.get("trackingCode");

    if (!trackingCode) {
      return Response.json({ error: "trackingCode required" }, { status: 400 });
    }

    // 🚨 TEMP MOCK RESPONSE (because API is invalid)
    const data = {
      status: "pending",
      current_location: "API not configured correctly",
    };

    return Response.json({
      success: true,
      trackingCode,
      status: data.status,
      location: data.current_location,
    });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
