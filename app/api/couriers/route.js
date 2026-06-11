import { connectDB } from "@/lib/databaseconnection";
import Courier from "@/models/Courier.model";

/**
 * GET ALL COURIERS
 */
export async function GET() {
  try {
    await connectDB();

    const couriers = await Courier.find().sort({ createdAt: -1 });

    return Response.json(
      {
        success: true,
        data: couriers,
      },
      { status: 200 },
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error.message || "Failed to fetch couriers",
      },
      { status: 500 },
    );
  }
}

/**
 * CREATE COURIER
 */
export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    // basic validation
    if (!body.name || !body.apiUrl) {
      return Response.json(
        {
          success: false,
          message: "Name and API URL required",
        },
        { status: 400 },
      );
    }

    const courier = await Courier.create({
      ...body,
      isActive: true,
      successCount: 0,
      failedCount: 0,
      successRate: 0,
    });

    return Response.json(
      {
        success: true,
        message: "Courier created successfully",
        data: courier,
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error.message || "Failed to create courier",
      },
      { status: 500 },
    );
  }
}
