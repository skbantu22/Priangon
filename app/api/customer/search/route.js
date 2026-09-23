import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import Customer from "@/models/Customer.model";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ?phone=017...  -> exact match, one customer (used by the checkout form)
// ?q=rahim       -> name / phone contains, up to 8 customers (POS picker)
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const phone = searchParams.get("phone");
    const q = (searchParams.get("q") || "").trim();

    if (q) {
      const rx = { $regex: escapeRegex(q), $options: "i" };
      const customers = await Customer.find({
        $or: [{ name: rx }, { phone: rx }],
      })
        .select("name phone address totalOrders totalSpent")
        .sort({ updatedAt: -1 })
        .limit(8)
        .lean();

      return NextResponse.json({ success: true, customers });
    }

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
