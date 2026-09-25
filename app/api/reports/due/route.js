import { NextResponse } from "next/server";
import mongoose from "mongoose";

import SupplierModel from "@/models/Supplier.model";
import PurchaseModel from "@/models/Purchase.model";
import POSOrderModel from "@/models/posorder.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";
import { supplierBalances } from "@/lib/supplierService";

/**
 * Who we owe and who owes us.
 *
 * Payable  = each supplier's balance (the same figure the supplier screens
 *            show: purchases, payments, advances, dismisses and returns)
 * Receivable = due left on completed POS sales, grouped per customer
 */
export async function GET(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const side = searchParams.get("side") || "all";

    const response = { success: true };

    if (side === "all" || side === "payable") {
      const suppliers = await SupplierModel.find({ deletedAt: null }).lean();

      const purchaseDue = await PurchaseModel.aggregate([
        {
          $match: {
            deletedAt: null,
            status: { $ne: "cancelled" },
            dueAmount: { $gt: 0 },
          },
        },
        {
          $group: {
            _id: "$supplierId",
            due: { $sum: "$dueAmount" },
            purchases: { $sum: 1 },
            oldestDueDate: { $min: "$purchaseDate" },
          },
        },
      ]);

      const balances = await supplierBalances(suppliers);

      const dueBySupplier = new Map(
        purchaseDue.map((row) => [String(row._id), row]),
      );

      const payable = suppliers
        .map((supplier) => {
          const row = dueBySupplier.get(String(supplier._id));

          const openingBalance = Number(supplier.openingBalance) || 0;
          const purchaseDueAmount = row?.due || 0;

          return {
            supplierId: supplier._id,
            name: supplier.name,
            companyName: supplier.companyName || "",
            phone: supplier.phone,
            openingBalance,
            purchaseDue: purchaseDueAmount,
            totalDue: balances.get(String(supplier._id))?.due ?? openingBalance + purchaseDueAmount,
            purchases: row?.purchases || 0,
            oldestDueDate: row?.oldestDueDate || null,
          };
        })
        .filter((row) => row.totalDue > 0)
        .sort((a, b) => b.totalDue - a.totalDue);

      response.payable = payable;
      response.totalPayable = payable.reduce(
        (sum, row) => sum + row.totalDue,
        0,
      );
    }

    if (side === "all" || side === "receivable") {
      const match = {
        status: "completed",
        dueAmount: { $gt: 0 },
      };

      const showroomId = searchParams.get("showroomId");

      if (mongoose.isValidObjectId(showroomId)) {
        match.showroomId = new mongoose.Types.ObjectId(showroomId);
      }

      const receivable = await POSOrderModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: { customerId: "$customerId", name: "$customerName" },
            totalDue: { $sum: "$dueAmount" },
            orders: { $sum: 1 },
            oldestDueDate: { $min: "$createdAt" },
            customerType: { $last: "$customerType" },
          },
        },
        { $sort: { totalDue: -1 } },
        { $limit: 500 },
      ]);

      response.receivable = receivable.map((row) => ({
        customerId: row._id.customerId,
        name: row._id.name || "Walk-in Customer",
        customerType: row.customerType || "retail",
        totalDue: row.totalDue,
        orders: row.orders,
        oldestDueDate: row.oldestDueDate,
      }));

      response.totalReceivable = receivable.reduce(
        (sum, row) => sum + row.totalDue,
        0,
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
