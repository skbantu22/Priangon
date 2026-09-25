import { NextResponse } from "next/server";

import Asset from "@/models/Asset.model";
import { connectDB } from "@/lib/databaseconnection";
import { actorName, requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { readAsset } from "@/lib/assetService";

const SORTS = {
  sl: { assetDate: 1, createdAt: 1 },
  date: { assetDate: 1, createdAt: 1 },
  category: { typeName: 1 },
  paidBy: { paymentMethod: 1 },
  note: { note: 1 },
  amount: { amount: 1 },
};

/** The asset list with the total of everything the filter matches */
export async function GET(req) {
  try {
    const auth = await requirePermission("assets.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const search = (searchParams.get("search") || "").trim();
    const sortKey = SORTS[searchParams.get("sort")] ? searchParams.get("sort") : "sl";
    const dir = searchParams.get("dir") === "desc" ? -1 : 1;
    const showAll = searchParams.get("limit") === "all";
    const limit = Math.min(200, Math.max(10, Number(searchParams.get("limit")) || 25));
    const page = Math.max(1, Number(searchParams.get("page")) || 1);

    const filter = { deletedAt: null };

    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: "i" };

      filter.$or = [
        { typeName: pattern },
        { note: pattern },
        { paymentMethod: pattern },
        { reference: pattern },
        { createdBy: pattern },
      ];
    }

    const sort = Object.fromEntries(
      Object.entries(SORTS[sortKey]).map(([key, value]) => [key, value * dir]),
    );

    const [total, sum] = await Promise.all([
      Asset.countDocuments(filter),
      Asset.aggregate([{ $match: filter }, { $group: { _id: null, amount: { $sum: "$amount" } } }]),
    ]);

    const size = showAll ? total || 1 : limit;

    const rows = await Asset.find(filter)
      .sort(sort)
      .skip(showAll ? 0 : (page - 1) * size)
      .limit(size)
      .lean();

    return NextResponse.json({
      success: true,
      data: rows,
      totalAmount: Math.round((sum[0]?.amount || 0) * 100) / 100,
      total,
      page: showAll ? 1 : page,
      pages: Math.max(1, Math.ceil(total / size)),
      from: total ? (showAll ? 1 : (page - 1) * size + 1) : 0,
    });
  } catch (error) {
    console.error("ASSET LIST ERROR:", error);

    return NextResponse.json({ success: false, message: "Could not load assets" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await requirePermission("assets.create");
    if (auth.response) return auth.response;

    await connectDB();

    const checked = await readAsset(await req.json());

    if (checked.error) {
      return NextResponse.json({ success: false, message: checked.error }, { status: 400 });
    }

    const asset = await Asset.create({ ...checked.data, createdBy: actorName(auth) });

    return NextResponse.json({ success: true, message: "Asset saved", data: asset });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
