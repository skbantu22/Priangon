import { NextResponse } from "next/server";
import SupportTicketModel from "@/models/SupportTicket.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";

export async function POST(req, { params }) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const body = await req.json();

    const message = body.body?.trim();

    if (!message) {
      return NextResponse.json(
        { success: false, message: "Write something before sending" },
        { status: 400 },
      );
    }

    const ticket = await SupportTicketModel.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found" },
        { status: 404 },
      );
    }

    ticket.messages.push({
      body: message,
      author: body.author?.trim() || "",
      authorType: body.authorType === "customer" ? "customer" : "staff",
    });

    // A reply on a settled ticket means it is live again
    if (["resolved", "closed"].includes(ticket.status)) {
      ticket.status = "in-progress";
      ticket.resolvedAt = null;
    } else if (ticket.status === "open") {
      ticket.status = "in-progress";
    }

    await ticket.save();

    return NextResponse.json({ success: true, data: ticket });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
