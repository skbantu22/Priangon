import { NextResponse } from "next/server";

import SupportTicketModel, {
  TICKET_CATEGORIES,
} from "@/models/SupportTicket.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";
import { getNextInvoiceNumber } from "@/lib/getNextOrderNumber";
import { isValidBdMobile, normalizeBdMobile } from "@/lib/bdFormat";

export async function POST(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();

    const customerName = body.customerName?.trim();
    const subject = body.subject?.trim();
    const phone = normalizeBdMobile(body.phone);

    if (!customerName || !subject) {
      return NextResponse.json(
        { success: false, message: "Customer name and subject are required" },
        { status: 400 },
      );
    }

    if (!isValidBdMobile(phone)) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a Bangladeshi mobile number (01XXXXXXXXX)",
        },
        { status: 400 },
      );
    }

    const description = body.description?.trim() || "";

    const seq = await getNextInvoiceNumber("support-ticket");

    const ticket = await SupportTicketModel.create({
      ticketNumber: `TKT-${seq}`,
      customerName,
      phone,
      email: body.email?.trim() || "",
      subject,
      description,
      category: TICKET_CATEGORIES.includes(body.category)
        ? body.category
        : "other",
      priority: body.priority || "medium",
      orderNumber: body.orderNumber?.trim() || "",
      imei: String(body.imei || "").replace(/\D/g, ""),
      assignedTo: body.assignedTo?.trim() || "",
      createdBy: body.createdBy?.trim() || "",
      // The opening complaint is the first message in the thread
      messages: description
        ? [
            {
              body: description,
              author: customerName,
              authorType: "customer",
            },
          ]
        : [],
    });

    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
