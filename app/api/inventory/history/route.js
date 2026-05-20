import { connectDB } from "@/lib/databaseconnection";
import InventoryTransaction from "@/models/InventoryTransaction.model";

export async function GET(req) {
  await connectDB();

  const history = await InventoryTransaction.find()
    .populate("productId")
    .populate("variantId")
    .sort({ createdAt: -1 })
    .limit(100);

  return Response.json({
    success: true,
    data: history,
  });
}
