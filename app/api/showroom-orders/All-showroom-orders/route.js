import { connectDB } from "@/lib/databaseconnection";
import { isAuthenticated } from "@/lib/auth.server"; // তোমার actual path
import Posorder from "@/models/posorder.model";
import Showroom from "@/models/Showroom.model";
import ShowroomOrderRequest from "@/models/ShowroomOrderRequest.model";

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

    const source = searchParams.get("source");

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

    // ==========================
    // ORDERS
    // ==========================

    let orders = [];
    let totalOrders = 0;

    if (source === "online") {
      const onlineFilter = {
        status: "approved",
      };

      // showroom filter
      if (auth.role === "admin") {
        if (showroomId && showroomId !== "all" && showroomId !== "undefined") {
          onlineFilter.showroomId = showroomId;
        }
      } else {
        onlineFilter.showroomId = auth.showroomId;
      }

      // search
      if (search && search.trim()) {
        onlineFilter.$or = [
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

      orders = await ShowroomOrderRequest.find(onlineFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      orders = orders.map((order) => ({
        ...order,
        orderSource: "ONLINE",
        orderNumber: order._id.toString(),
        customerName: order.customer?.name || "",
      }));

      totalOrders = await ShowroomOrderRequest.countDocuments(onlineFilter);
    } else {
      orders = await Posorder.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      orders = orders.map((order) => ({
        ...order,
        orderSource: "POS",
      }));

      totalOrders = await Posorder.countDocuments(filter);
    }

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

    // ==========================
    // SUMMARY
    // ==========================

    const posOrders = await Posorder.find(filter)
      .select("showroomId total createdAt")
      .lean();

    const onlineSummaryFilter = {
      status: "approved",
    };

    if (auth.role === "admin") {
      if (showroomId && showroomId !== "all") {
        onlineSummaryFilter.showroomId = showroomId;
      }
    } else {
      onlineSummaryFilter.showroomId = auth.showroomId;
    }

    const onlineOrders = await ShowroomOrderRequest.find(onlineSummaryFilter)
      .select("showroomId total createdAt")
      .lean();
    let monthSales = 0;
    let monthPosSales = 0;
    let monthOnlineSales = 0;

    let monthOrders = 0;
    let monthPosOrders = 0;
    let monthOnlineOrders = 0;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    let posSales = 0;
    let onlineSales = 0;

    let todaySales = 0;
    let todayPosSales = 0;
    let todayOnlineSales = 0;

    let todayPosOrders = 0;
    let todayOnlineOrders = 0;

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const showroomSummary = {};

    // POS SALES

    // POS SALES

    posOrders.forEach((order) => {
      const amount = Number(order.total || 0);
      const created = new Date(order.createdAt);

      posSales += amount;

      // TODAY
      if (created >= today) {
        todaySales += amount;
        todayPosSales += amount;
        todayPosOrders++;
      }

      // MONTH
      if (created >= monthStart) {
        monthSales += amount;
        monthPosSales += amount;
        monthOrders++;
        monthPosOrders++;
      }

      const id = order.showroomId.toString();

      if (!showroomSummary[id]) {
        showroomSummary[id] = {
          showroomId: id,
          showroomName: showroomMap[id] || "Unknown",
          totalOrders: 0,
          totalSales: 0,
          posSales: 0,
          onlineSales: 0,
        };
      }

      showroomSummary[id].totalOrders++;
      showroomSummary[id].totalSales += amount;
      showroomSummary[id].posSales += amount;
    });

    // ONLINE SALES

    // ONLINE SALES

    // ONLINE SALES

    onlineOrders.forEach((order) => {
      const amount = Number(order.total || 0);
      const created = new Date(order.createdAt);

      onlineSales += amount;

      // TODAY
      if (created >= today) {
        todaySales += amount;
        todayOnlineSales += amount;
        todayOnlineOrders++;
      }

      // MONTH
      if (created >= monthStart) {
        monthSales += amount;
        monthOnlineSales += amount;
        monthOrders++;
        monthOnlineOrders++;
      }

      const id = order.showroomId.toString();

      if (!showroomSummary[id]) {
        showroomSummary[id] = {
          showroomId: id,
          showroomName: showroomMap[id] || "Unknown",
          totalOrders: 0,
          totalSales: 0,
          posSales: 0,
          onlineSales: 0,
        };
      }

      showroomSummary[id].totalOrders++;
      showroomSummary[id].totalSales += amount;
      showroomSummary[id].onlineSales += amount;
    });

    const totalSales = posSales + onlineSales;

    const totalPosOrders = posOrders.length;
    const totalOnlineOrders = onlineOrders.length;

    const totalAllOrders = totalPosOrders + totalOnlineOrders;

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
        // ==========================
        // ALL TIME
        // ==========================
        totalOrders: totalAllOrders,
        totalPosOrders,
        totalOnlineOrders,

        totalSales,
        posSales,
        onlineSales,

        // ==========================
        // TODAY
        // ==========================
        todaySales,
        todayPosSales,
        todayOnlineSales,

        todayPosOrders,
        todayOnlineOrders,

        // ==========================
        // THIS MONTH
        // ==========================
        monthOrders,
        monthPosOrders,
        monthOnlineOrders,

        monthSales,
        monthPosSales,
        monthOnlineSales,

        // ==========================
        // SHOWROOM
        // ==========================
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
