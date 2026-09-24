import { NextResponse } from "next/server";
import SupportTicketModel from "@/models/SupportTicket.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";

export async function DELETE(req, { params }) {
  try {
    const auth = await requireRoles(ADMIN_ONLY);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

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

    ticket.deletedAt = new Date();
    await ticket.save();

    return NextResponse.json({
      success: true,
      message: "Ticket moved to trash",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
