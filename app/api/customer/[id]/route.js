import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Customer from "@/models/Customer.model";
import CustomerPayment from "@/models/CustomerPayment.model";
import POSOrder from "@/models/posorder.model";
import PartnerOrder from "@/models/PartnerOrder.model";
import UserModel from "@/models/User.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { normalizeCustomerType } from "@/lib/priceTiers";
import { customerBalance, readCustomer } from "@/lib/customerService";

const notFound = () =>
  NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });

const findCustomer = (id) => (mongoose.isValidObjectId(id) ? Customer.findById(id) : null);

/** One customer with their balance, for the payment and ledger screens */
export async function GET(req, { params }) {
  try {
    const auth = await requirePermission("customers.due");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    const customer = await findCustomer(id)?.lean();

    if (!customer) return notFound();

    const hasLogin = await UserModel.exists({ customerId: customer._id, deletedAt: null });

    return NextResponse.json({
      success: true,
      data: {
        ...customer,
        type: customer.type || "retail",
        isActive: customer.isActive !== false,
        hasLogin: Boolean(hasLogin),
        balance: await customerBalance(customer),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** Edit from the customer list */
export async function PUT(req, { params }) {
  try {
    const auth = await requirePermission("customers.edit");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    const customer = await findCustomer(id);

    if (!customer) return notFound();

    const body = await req.json();
    const { data, error } = readCustomer(body);

    if (error) return NextResponse.json({ success: false, message: error }, { status: 400 });

    if (data.phone !== customer.phone) {
      const taken = await Customer.findOne({ phone: data.phone, _id: { $ne: customer._id } })
        .select("name")
        .lean();

      if (taken) {
        return NextResponse.json(
          { success: false, message: `${data.phone} already belongs to ${taken.name}` },
          { status: 409 },
        );
      }
    }

    const type = normalizeCustomerType(body.type);

    // a partner login buys at its own role's rate; the two must not drift apart
    if (type !== (customer.type || "retail")) {
      const login = await UserModel.findOne({ customerId: customer._id, deletedAt: null })
        .select("role")
        .lean();

      if (login) {
        return NextResponse.json(
          {
            success: false,
            message: "This customer has a dealer login. Change their type from Dealers & Wholesalers.",
          },
          { status: 409 },
        );
      }
    }

    Object.assign(customer, data, { type });
    await customer.save();

    return NextResponse.json({ success: true, message: "Customer updated", data: customer });
  } catch (error) {
    console.error("CUSTOMER UPDATE ERROR:", error);

    return NextResponse.json({ success: false, message: "Could not save customer" }, { status: 500 });
  }
}

/**
 * Deletes a customer who has no history. Anyone with sales, receipts or a
 * login is kept, because their invoices point at them; deactivate instead.
 */
export async function DELETE(req, { params }) {
  try {
    const auth = await requirePermission("customers.delete");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    const customer = await findCustomer(id);

    if (!customer) return notFound();

    const [sale, payment, partnerOrder, login] = await Promise.all([
      POSOrder.exists({ customerId: customer._id }),
      CustomerPayment.exists({ customerId: customer._id, deletedAt: null }),
      PartnerOrder.exists({ customerId: customer._id }),
      UserModel.exists({ customerId: customer._id, deletedAt: null }),
    ]);

    if (sale || payment || partnerOrder || login) {
      return NextResponse.json(
        {
          success: false,
          message: `${customer.name} has sales or payments, so they cannot be deleted. Deactivate them instead.`,
        },
        { status: 409 },
      );
    }

    if (Number(customer.openingDue) || Number(customer.initialAdvance)) {
      return NextResponse.json(
        { success: false, message: `${customer.name} has an opening due or advance. Deactivate them instead.` },
        { status: 409 },
      );
    }

    await customer.deleteOne();

    return NextResponse.json({ success: true, message: `${customer.name} deleted` });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
