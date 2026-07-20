import { NextResponse } from "next/server";
import ShowroomOrderRequest from "@/models/ShowroomOrderRequest.model";
import { connectDB } from "@/lib/databaseconnection";

import "@/models/Product.model";
import "@/models/ProductVariant.model ";
import "@/models/Media.model";
import "@/models/Showroom.model";

// ==========================
// GET ORDERS
// ==========================
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const showroomId = searchParams.get("showroomId");

    const filter = {};

    if (showroomId && showroomId !== "undefined" && showroomId !== "all") {
      filter.showroomId = showroomId;
    }

    const orders = await ShowroomOrderRequest.find(filter)
      .populate({
        path: "showroomId",
        select: "name",
      })
      .populate({
        path: "items.productId",
        select: "name media",
        populate: {
          path: "media",
          select: "secure_url",
        },
      })
      .populate({
        path: "items.variantId",
        select: "color size sku barcode media",
        populate: {
          path: "media",
          select: "secure_url",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
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

// ==========================
// CREATE ORDER
// ==========================
export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    const order = await ShowroomOrderRequest.create(body);

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    return NextResponse.json(
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
