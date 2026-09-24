import { NextResponse } from "next/server";
import SupportTicketModel from "@/models/SupportTicket.model";
import { connectDB } from "@/lib/databaseconnection";
import { normalizeBdMobile } from "@/lib/bdFormat";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const filter = { deletedAt: null };

    const status = searchParams.get("status");
    if (status && status !== "all") filter.status = status;

    const category = searchParams.get("category");
    if (category && category !== "all") filter.category = category;

    const priority = searchParams.get("priority");
    if (priority && priority !== "all") filter.priority = priority;

    const search = searchParams.get("search")?.trim();

    if (search) {
      // A phone typed as +880… still has to find the ticket
      const phone = normalizeBdMobile(search);

      filter.$or = [
        { ticketNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
        { orderNumber: { $regex: search, $options: "i" } },
        { imei: { $regex: search, $options: "i" } },
        ...(phone ? [{ phone: { $regex: phone, $options: "i" } }] : []),
      ];
    }

    const tickets = await SupportTicketModel.find(filter)
      .sort({ updatedAt: -1 })
      .limit(200);

    const counts = await SupportTicketModel.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    return NextResponse.json({
      success: true,
      data: tickets,
      counts: Object.fromEntries(counts.map((row) => [row._id, row.count])),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
