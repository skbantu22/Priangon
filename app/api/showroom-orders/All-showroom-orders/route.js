// app/api/showroom-orders/All-showroom-orders/route.js

import { connectDB } from "@/lib/databaseconnection";
import Posorder from "@/models/posorder.model";
import Showroom from "@/models/Showroom.model";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const showroomId = searchParams.get("showroomId");

    const filter = {};

    if (showroomId && showroomId !== "all" && showroomId !== "undefined") {
      filter.showroomId = showroomId;
    }

    // ===============================
    // ALL ORDERS
    // ===============================

    const orders = await Posorder.find(filter).sort({ createdAt: -1 }).lean();

    // ===============================
    // ALL SHOWROOMS
    // ===============================

    const showrooms = await Showroom.find().lean();

    const showroomMap = {};

    showrooms.forEach((item) => {
      showroomMap[item._id.toString()] = item.name;
    });

    // ===============================
    // TODAY SALES
    // ===============================

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter(
      (order) => new Date(order.createdAt) >= today,
    );

    // ===============================
    // SHOWROOM SUMMARY
    // ===============================

    const showroomSummary = {};

    orders.forEach((order) => {
      const id = order.showroomId;

      if (!showroomSummary[id]) {
        showroomSummary[id] = {
          showroomId: id,
          showroomName: showroomMap[id] || "Unknown Showroom",
          totalOrders: 0,
          totalSales: 0,
        };
      }

      showroomSummary[id].totalOrders += 1;
      showroomSummary[id].totalSales += Number(order.total || 0);
    });

    // ===============================
    // RESPONSE
    // ===============================

    return NextResponse.json({
      success: true,

      orders,

      summary: {
        totalOrders: orders.length,

        totalSales: orders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0,
        ),

        todaySales: todayOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0,
        ),

        showroomSales: Object.values(showroomSummary),
      },
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
