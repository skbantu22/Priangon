import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import Customer from "@/models/Customer.model";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({
        success: false,
        message: "Phone required",
      });
    }

    const customer = await Customer.findOne({
      phone,
    });

    if (!customer) {
      return NextResponse.json({
        success: false,
        customer: null,
      });
    }

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      {
        status: 500,
      },
    );
  }
}
