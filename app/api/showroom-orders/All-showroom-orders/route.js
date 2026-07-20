import { connectDB } from "@/lib/databaseconnection";
import { isAuthenticated } from "@/lib/auth.server"; // তোমার actual path
import Posorder from "@/models/posorder.model";
import Showroom from "@/models/Showroom.model";

import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectDB();

    const auth = await isAuthenticated();

    if (!auth.isAuth) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { searchParams } = new URL(req.url);

    // ==========================
    // FILTER PARAMS
    // ==========================

    const showroomId = searchParams.get("showroomId");

    const paymentMethod = searchParams.get("paymentMethod");

    const orderType = searchParams.get("orderType");

    const status = searchParams.get("status");

    const search = searchParams.get("search");

    const dateFrom = searchParams.get("dateFrom");

    const dateTo = searchParams.get("dateTo");

    // ==========================
    // PAGINATION
    // ==========================

    const page = Number(searchParams.get("page")) || 1;

    const limit = Number(searchParams.get("limit")) || 10;

    const skip = (page - 1) * limit;

    // ==========================
    // BUILD FILTER
    // ==========================

    const filter = {};

    // showroom

    // ==========================
    // ROLE BASED SHOWROOM FILTER
    // ==========================

    if (auth.role === "admin") {
      if (showroomId && showroomId !== "all" && showroomId !== "undefined") {
        filter.showroomId = showroomId;
      }
    } else if (auth.role === "cashier" || auth.role === "manager") {
      filter.showroomId = auth.showroomId;
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 },
      );
    }
    // payment

    if (paymentMethod) {
      filter["payments.type"] = paymentMethod;
    }

    // order type

    if (orderType) {
      filter.orderType = orderType;
    }

    // status

    if (status) {
      filter.status = status;
    }

    // date range

    if (dateFrom || dateTo) {
      filter.createdAt = {};

      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }

      if (dateTo) {
        const endDate = new Date(dateTo);

        endDate.setHours(23, 59, 59, 999);

        filter.createdAt.$lte = endDate;
      }
    }

    // ==========================
    // SEARCH
    // ==========================

    if (search && search.trim()) {
      filter.$or = [
        {
          orderNumber: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          customerName: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          phone: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }
    // ==========================
    // TOTAL COUNT
    // ==========================

    const totalOrders = await Posorder.countDocuments(filter);

    // ==========================
    // ORDERS
    // ==========================

    const orders = await Posorder.find(filter)
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean();

    // ==========================
    // SHOWROOM MAP
    // ==========================

    const showrooms = await Showroom.find().lean();

    const showroomMap = {};

    showrooms.forEach((item) => {
      showroomMap[item._id.toString()] = item.name;
    });

    // ==========================
    // SUMMARY
    // ==========================

    const allOrders = await Posorder.find(filter)
      .select("showroomId total createdAt")
      .lean();
    let totalSales = 0;

    let todaySales = 0;

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const showroomSummary = {};

    allOrders.forEach((order) => {
      const amount = Number(order.total || 0);

      totalSales += amount;

      if (new Date(order.createdAt) >= today) {
        todaySales += amount;
      }

      const id = order.showroomId;

      if (!showroomSummary[id]) {
        showroomSummary[id] = {
          showroomId: id,

          showroomName: showroomMap[id] || "Unknown",

          totalOrders: 0,

          totalSales: 0,
        };
      }

      showroomSummary[id].totalOrders++;

      showroomSummary[id].totalSales += amount;
    });

    // ==========================
    // RESPONSE
    // ==========================

    return NextResponse.json({
      success: true,

      orders,

      pagination: {
        page,

        limit,

        totalOrders,

        totalPages: Math.ceil(totalOrders / limit),
      },

      summary: {
        totalOrders,

        totalSales,

        todaySales,

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
