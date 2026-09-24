import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import Customer from "@/models/Customer.model";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ?phone=017...  -> exact match, one customer (used by the checkout form)
// ?q=rahim       -> name / phone contains, up to 8 customers (POS picker)
// ?recent=1      -> the 10 most recent customers
export async function GET(req) {
  try {
    const auth = await requireRoles(STAFF_ROLES);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const phone = searchParams.get("phone");
    const q = (searchParams.get("q") || "").trim();

    if (q) {
      const rx = { $regex: escapeRegex(q), $options: "i" };
      const customers = await Customer.find({
        $or: [{ name: rx }, { phone: rx }],
      })
        .select("name phone address type totalOrders totalSpent")
        .sort({ updatedAt: -1 })
        .limit(8)
        .lean();

      return NextResponse.json({ success: true, customers });
    }

    // ?recent=1 -> latest customers (POS customer modal before typing)
    if (searchParams.get("recent")) {
      const customers = await Customer.find({})
        .select("name phone address type totalOrders totalSpent")
        .sort({ updatedAt: -1 })
        .limit(10)
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
