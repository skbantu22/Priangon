import { NextResponse } from "next/server";
import SupportTicketModel from "@/models/SupportTicket.model";
import { connectDB } from "@/lib/databaseconnection";

export async function PUT(req, { params }) {
  try {
    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const body = await req.json();

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

    for (const field of ["status", "priority", "category", "assignedTo"]) {
      if (field in body) ticket[field] = body[field];
    }

    // resolvedAt tracks the first time it was settled, and clears if the
    // ticket is reopened
    if (["resolved", "closed"].includes(ticket.status)) {
      ticket.resolvedAt = ticket.resolvedAt || new Date();
    } else {
      ticket.resolvedAt = null;
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
