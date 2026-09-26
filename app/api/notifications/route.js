import mongoose from "mongoose";
import { NextResponse } from "next/server";

import PartnerOrder from "@/models/PartnerOrder.model";
import SupplierSchedule from "@/models/SupplierSchedule.model";
import { connectDB } from "@/lib/databaseconnection";
import { permissionsFor, requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

const TYPE_LABEL = { dealer: "Dealer", subDealer: "Sub Dealer", wholesaler: "Wholesaler" };

/**
 * The header bell, like 360's reminder bell: supplier schedules due today
 * or overdue — and, for this business, new dealer / sub dealer /
 * wholesaler orders waiting to be accepted and stock running low. Each
 * part shows only to someone allowed to act on it.
 */
export async function GET() {
  try {
    const auth = await requireRoles(STAFF_ROLES);
    if (auth.response) return auth.response;

    await connectDB();

    const held = await permissionsFor(auth);
    const can = (permission) => held.includes(permission);
    const db = mongoose.connection.db;

    const endOfToday = new Date(`${new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10)}T23:59:59.999+06:00`);

    const [orders, orderCount, schedules, lowStock] = await Promise.all([
      can("partnerOrders.view")
        ? PartnerOrder.find({ status: "pending" }).select("orderNumber customerName customerType total createdAt").sort({ createdAt: -1 }).limit(8).lean()
        : [],
      can("partnerOrders.view") ? PartnerOrder.countDocuments({ status: "pending" }) : 0,
      can("suppliers.view")
        ? SupplierSchedule.find({ status: "pending", scheduledAt: { $lte: endOfToday } })
            .populate("supplierId", "name")
            .sort({ scheduledAt: 1 })
            .limit(20)
            .lean()
        : [],
      can("stock.view")
        ? db
            .collection("productvariants")
            .aggregate([
              { $match: { deletedAt: null } },
              { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "p" } },
              { $unwind: "$p" },
              { $match: { "p.deletedAt": null } },
              { $lookup: { from: "showroomstocks", localField: "_id", foreignField: "variantId", as: "sr" } },
              { $lookup: { from: "warehousestocks", localField: "_id", foreignField: "variantId", as: "wh" } },
              { $addFields: { stock: { $add: [{ $sum: "$sr.stock" }, { $sum: "$wh.stock" }] }, alert: { $ifNull: ["$p.alertQuantity", 0] } } },
              // out of stock, or at / below the product's alert quantity
              { $match: { $expr: { $lte: ["$stock", "$alert"] } } },
              { $project: { name: "$p.name", color: 1, size: 1, stock: 1, alert: 1 } },
              { $sort: { stock: 1 } },
            ])
            .toArray()
        : [],
    ]);

    const startOfToday = new Date(endOfToday.getTime() - 86400000 + 1);

    return NextResponse.json({
      success: true,
      count: orderCount + schedules.length + lowStock.length,
      partnerOrders: {
        count: orderCount,
        data: orders.map((o) => ({
          _id: o._id,
          orderNumber: o.orderNumber,
          name: o.customerName,
          type: TYPE_LABEL[o.customerType] || o.customerType,
          total: o.total,
          createdAt: o.createdAt,
        })),
      },
      schedules: {
        count: schedules.length,
        data: schedules.map((s) => ({
          _id: s._id,
          supplier: s.supplierId?.name || "",
          purpose: s.purpose,
          scheduledAt: s.scheduledAt,
          overdue: s.scheduledAt < startOfToday,
        })),
      },
      lowStock: {
        count: lowStock.length,
        data: lowStock.slice(0, 8).map((v) => ({
          _id: v._id,
          name: [v.name, [v.size, v.color].filter((x) => x && !/^(default|standard)$/i.test(x)).join(" / ")].filter(Boolean).join(" — "),
          stock: v.stock,
          alert: v.alert,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
