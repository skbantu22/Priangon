import { connectDB } from "@/lib/databaseconnection";
import Showroom from "@/models/Showroom.model";

// ================= GET ALL SHOWROOMS =================
export async function GET() {
  try {
    await connectDB();

    const showrooms = await Showroom.find().sort({ createdAt: -1 });

    return Response.json({
      success: true,
      showrooms,
    });
  } catch (err) {
    return Response.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 },
    );
  }
}

// ================= CREATE SHOWROOM =================
export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    if (!body.name) {
      throw new Error("Showroom name required");
    }

    const exists = await Showroom.findOne({
      name: body.name,
    });

    if (exists) {
      throw new Error("Showroom already exists");
    }

    const showroom = await Showroom.create({
      name: body.name,
      address: body.address,
      phone: body.phone,
    });

    return Response.json({
      success: true,
      showroom,
    });
  } catch (err) {
    return Response.json(
      {
        success: false,
        message: err.message,
      },
      { status: 400 },
    );
  }
}
