import { connectDB } from "@/lib/databaseconnection";
import ShowroomInventory from "@/models/ShowroomInventory.model";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const showroomId = searchParams.get("showroomId");

    // ✅ admin sees all, cashier sees filtered
    const filter = showroomId ? { showroomId } : {};

    const inventory = await ShowroomInventory.find(filter)
      .populate("productId", "name")
      .populate("variantId", "color size");

    return Response.json({
      success: true,
      data: inventory,
    });
  } catch (err) {
    console.log("❌ INVENTORY ERROR:", err);

    return Response.json(
      { success: false, message: err.message },
      { status: 500 },
    );
  }
}
