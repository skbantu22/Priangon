import { connectDB } from "@/lib/db";
import { decreaseStock } from "@/lib/inventoryService";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    const result = await decreaseStock(body);

    return Response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      },
    );
  }
}
