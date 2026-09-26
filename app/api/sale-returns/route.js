import { NextResponse } from "next/server";

import SaleReturn from "@/models/SaleReturn.model";
import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { createSaleReturn } from "@/lib/saleReturnService";

/** Sales Return List: every return, newest first, with totals */
export async function GET(req) {
  try {
    const auth = await requirePermission("orders.view");
    if (auth.response) return auth.response;

    await connectDB();

    const q = new URL(req.url).searchParams;
    const filter = { deletedAt: null };

    const from = q.get("from");
    const to = q.get("to");
    if (from || to) {
      filter.returnDate = {};
      if (from) filter.returnDate.$gte = new Date(`${from}T00:00:00+06:00`);
      if (to) filter.returnDate.$lte = new Date(`${to}T23:59:59.999+06:00`);
    }

    const search = q.get("search")?.trim();
    if (search) {
      const regex = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [{ returnNumber: regex }, { orderNumber: regex }, { customerName: regex }, { phone: regex }, { "items.imeis": regex }];
    }

    const returns = await SaleReturn.find(filter).sort({ returnDate: -1, createdAt: -1 }).limit(500).lean();

    return NextResponse.json({
      success: true,
      data: returns.map((r) => ({ ...r, qty: r.items.reduce((sum, i) => sum + i.qty, 0) })),
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await requirePermission("pos.return");
    if (auth.response) return auth.response;

    await connectDB();

    let ret;
    try {
      ret = await createSaleReturn(await req.json(), await actorFullName(auth));
    } catch (formError) {
      return NextResponse.json({ success: false, message: formError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Sale return ${ret.returnNumber} saved`, data: ret }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
