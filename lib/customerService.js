import mongoose from "mongoose";

import POSOrder from "@/models/posorder.model";
import CustomerModel from "@/models/Customer.model";
import CustomerPayment from "@/models/CustomerPayment.model";
import { nextDocumentNumber } from "@/lib/stockService";

/**
 * What a customer and the shop owe each other.
 *
 * Total is the opening due plus every completed POS invoice. Paid is what
 * was paid on those invoices plus any receipt not tied to an invoice (a
 * receipt spread over invoices is already on them, so it is not counted
 * twice).
 *
 *   due = total − paid − dismiss − advance + paid out to the customer
 *
 * A negative due means the shop owes the customer.
 */

export const PAYMENT_TYPES = ["receive", "pay", "dismiss", "advance", "advance_refund"];

const PREFIX = {
  receive: "CRV",
  pay: "CPY",
  dismiss: "CDS",
  advance: "CAD",
  advance_refund: "CAR",
};

export const PAYMENT_LABEL = {
  receive: "Due Received",
  pay: "Due Paid",
  dismiss: "Due Dismiss",
  advance: "Advance Received",
  advance_refund: "Advance Refund",
};

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

const toIds = (ids) => ids.map((id) => new mongoose.Types.ObjectId(String(id)));

const SALE_MATCH = { status: "completed" };

/** Balances for many customers at once, keyed by customer id */
export async function customerBalances(customers) {
  const ids = toIds(customers.map((customer) => customer._id));

  if (!ids.length) return new Map();

  const [sales, payments] = await Promise.all([
    POSOrder.aggregate([
      { $match: { ...SALE_MATCH, customerId: { $in: ids } } },
      {
        $group: {
          _id: "$customerId",
          total: { $sum: { $ifNull: ["$total", 0] } },
          due: { $sum: { $ifNull: ["$dueAmount", 0] } },
          dismissed: { $sum: { $ifNull: ["$dismissAmount", 0] } },
          count: { $sum: 1 },
          lastSale: { $max: "$createdAt" },
        },
      },
    ]),

    CustomerPayment.aggregate([
      { $match: { customerId: { $in: ids }, deletedAt: null } },
      {
        $group: {
          _id: { customerId: "$customerId", type: "$type" },
          amount: { $sum: "$amount" },
          allocated: { $sum: { $sum: "$allocations.amount" } },
        },
      },
    ]),
  ]);

  const saleBy = new Map(sales.map((row) => [String(row._id), row]));
  const paymentBy = new Map(payments.map((row) => [`${row._id.customerId}:${row._id.type}`, row]));

  const balances = new Map();

  for (const customer of customers) {
    const id = String(customer._id);
    const sum = (type) => paymentBy.get(`${id}:${type}`)?.amount || 0;
    const unallocated = (type) => {
      const row = paymentBy.get(`${id}:${type}`);
      return row ? row.amount - row.allocated : 0;
    };

    const sale = saleBy.get(id);
    const saleTotal = sale?.total || 0;
    const opening = Number(customer.openingDue) || 0;
    const total = opening + saleTotal;
    const paid = saleTotal - (sale?.due || 0) - (sale?.dismissed || 0) + unallocated("receive");
    const dismiss = sum("dismiss");
    const paidOut = sum("pay");
    const advance =
      (Number(customer.initialAdvance) || 0) + sum("advance") - sum("advance_refund");

    balances.set(id, {
      opening: round(opening),
      saleTotal: round(saleTotal),
      saleCount: sale?.count || 0,
      lastSale: sale?.lastSale || null,
      total: round(total),
      paid: round(paid),
      tradeDue: round(total - paid),
      dismiss: round(dismiss),
      advance: round(advance),
      paidOut: round(paidOut),
      due: round(total - paid - dismiss - advance + paidOut),
    });
  }

  return balances;
}

export async function customerBalance(customer) {
  return (await customerBalances([customer])).get(String(customer._id));
}

/** POS invoices that still carry a due, oldest first */
export async function dueInvoices(customerId) {
  const orders = await POSOrder.find({
    ...SALE_MATCH,
    customerId,
    dueAmount: { $gt: 0.009 },
  })
    .select("orderNumber saleDate createdAt total dueAmount")
    .sort({ createdAt: 1 })
    .lean();

  return orders.map((order) => ({
    id: String(order._id),
    orderNumber: order.orderNumber,
    date: order.saleDate || order.createdAt,
    total: round(order.total),
    due: round(order.dueAmount),
  }));
}

/**
 * Every line that moved the customer's balance, oldest first, each with
 * the due it left behind. Lines before the start date fold into the
 * opening figure.
 */
export async function customerLedger(customer, { start, end } = {}) {
  const lines = [];
  const openedOn = customer.openingDate || customer.createdAt;

  if (Number(customer.openingDue)) {
    lines.push({ date: openedOn, type: "Opening Due", invoiceNo: "", note: "", amount: Number(customer.openingDue) });
  }

  if (Number(customer.initialAdvance)) {
    lines.push({ date: openedOn, type: "Opening Advance", invoiceNo: "", note: "", amount: -Number(customer.initialAdvance) });
  }

  const [orders, payments] = await Promise.all([
    POSOrder.find({ ...SALE_MATCH, customerId: customer._id })
      .select("orderNumber saleDate createdAt total dueAmount dismissAmount remark")
      .lean(),
    CustomerPayment.find({ customerId: customer._id, deletedAt: null }).lean(),
  ]);

  // receipts written onto an invoice later are not part of what was paid at the counter
  const receivedLater = new Map();

  for (const payment of payments) {
    if (payment.type !== "receive") continue;

    for (const share of payment.allocations) {
      const key = String(share.orderId);
      receivedLater.set(key, (receivedLater.get(key) || 0) + share.amount);
    }
  }

  for (const order of orders) {
    const date = order.saleDate || order.createdAt;
    const total = Number(order.total) || 0;

    lines.push({ date, type: "Sale", invoiceNo: order.orderNumber, note: order.remark || "", amount: total });

    const paidAtCounter = round(
      total - (Number(order.dueAmount) || 0) - (Number(order.dismissAmount) || 0) - (receivedLater.get(String(order._id)) || 0),
    );

    if (paidAtCounter > 0) {
      lines.push({ date, type: "Sale Payment", invoiceNo: order.orderNumber, note: "", amount: -paidAtCounter });
    }
  }

  for (const payment of payments) {
    const reducesDue = ["receive", "dismiss", "advance"].includes(payment.type);
    const against = payment.allocations.map((row) => row.orderNumber).join(", ");

    lines.push({
      date: payment.date,
      type: PAYMENT_LABEL[payment.type],
      invoiceNo: payment.invoiceNo,
      note: [payment.note, against && `For ${against}`].filter(Boolean).join(" · "),
      method: payment.type === "dismiss" ? "" : payment.method,
      amount: reducesDue ? -payment.amount : payment.amount,
    });
  }

  lines.sort((a, b) => new Date(a.date) - new Date(b.date));

  const from = start ? new Date(`${start}T00:00:00`) : null;
  const to = end ? new Date(`${end}T23:59:59.999`) : null;

  let balance = 0;
  let opening = 0;
  const rows = [];

  for (const line of lines) {
    const when = new Date(line.date);

    if (from && when < from) {
      opening += line.amount;
      balance += line.amount;
      continue;
    }

    if (to && when > to) continue;

    balance += line.amount;
    rows.push({ ...line, amount: round(line.amount), balance: round(balance) });
  }

  const inPeriod = (type) =>
    round(rows.filter((row) => row.type === type).reduce((sum, row) => sum + row.amount, 0));

  return {
    rows,
    summary: {
      opening: round(opening),
      totalSale: inPeriod("Sale"),
      totalPaid: round(-(inPeriod("Sale Payment") + inPeriod(PAYMENT_LABEL.receive))),
      dismiss: round(-inPeriod(PAYMENT_LABEL.dismiss)),
      paidOut: inPeriod(PAYMENT_LABEL.pay),
      advance: round(
        -(inPeriod(PAYMENT_LABEL.advance) + inPeriod("Opening Advance")) -
          inPeriod(PAYMENT_LABEL.advance_refund),
      ),
      due: round(balance),
    },
  };
}

/**
 * Writes a share onto a POS invoice. The update only lands if the due is
 * still what was read, so two receipts at once cannot both spend it.
 */
async function shiftInvoice(order, field, share) {
  const due = round(Math.max(0, Number(order.dueAmount) - share));
  const other = round(Math.max(0, (Number(order[field]) || 0) + share));

  const result = await POSOrder.updateOne(
    { _id: order._id, dueAmount: order.dueAmount },
    { $set: { dueAmount: due, [field]: other } },
  );

  if (!result.modifiedCount) {
    throw new Error(`${order.orderNumber} changed while saving; try again`);
  }
}

/**
 * Saves a customer receipt and writes its invoice shares.
 *
 * Every check runs before anything is written, so a bad share cannot
 * leave half the invoices updated.
 */
export async function createCustomerPayment({ customer, type, body, createdBy }) {
  if (!PAYMENT_TYPES.includes(type)) throw new Error("Unknown payment type");

  const amount = round(body.amount);

  if (!(amount > 0)) throw new Error("Enter an amount greater than 0");

  const balance = await customerBalance(customer);
  const owes = Math.max(0, balance.due);
  const owed = Math.max(0, -balance.due);

  if (type === "receive" && amount - owes > 0.009) {
    throw new Error(
      owes > 0
        ? `Only ${owes} is due from this customer; take the rest as an advance`
        : "This customer owes nothing; take it as an advance instead",
    );
  }

  if (type === "dismiss" && amount - owes > 0.009) {
    throw new Error(`Only ${owes} is due from this customer`);
  }

  if (type === "pay" && amount - owed > 0.009) {
    throw new Error(
      owed > 0
        ? `The shop owes this customer only ${owed}`
        : "The shop owes this customer nothing, so there is nothing to pay",
    );
  }

  if (type === "advance_refund" && amount - balance.advance > 0.009) {
    throw new Error(`The advance from this customer is only ${balance.advance}`);
  }

  // Shares only make sense when receiving or dismissing an invoice due
  const shares = [];

  if (type === "receive" || type === "dismiss") {
    for (const raw of Array.isArray(body.allocations) ? body.allocations : []) {
      const share = round(raw?.amount);

      if (!(share > 0)) continue;

      if (!mongoose.isValidObjectId(raw?.orderId)) throw new Error("An invoice is invalid");

      const order = await POSOrder.findOne({ _id: raw.orderId, customerId: customer._id, ...SALE_MATCH })
        .select("orderNumber dueAmount paidAmount dismissAmount")
        .lean();

      if (!order) throw new Error("An invoice no longer belongs to this customer");

      if (share - order.dueAmount > 0.009) {
        throw new Error(`${order.orderNumber}: only ${order.dueAmount} is due`);
      }

      shares.push({ order, amount: share });
    }

    if (shares.reduce((sum, row) => sum + row.amount, 0) - amount > 0.009) {
      throw new Error("The invoice amounts add up to more than the payment");
    }
  }

  const method = type === "dismiss" ? "other" : body.method || "cash";

  const payment = await CustomerPayment.create({
    invoiceNo: await nextDocumentNumber(PREFIX[type], `customer_${type}`),
    customerId: customer._id,
    type,
    amount,
    method,
    reference: String(body.reference || "").trim(),
    note: String(body.note || "").trim(),
    date: body.date ? new Date(body.date) : new Date(),
    allocations: shares.map((row) => ({
      orderId: row.order._id,
      orderNumber: row.order.orderNumber,
      amount: row.amount,
    })),
    createdBy,
  });

  const field = type === "receive" ? "paidAmount" : "dismissAmount";
  const written = [];

  try {
    for (const row of shares) {
      await shiftInvoice(row.order, field, row.amount);
      written.push(row);
    }
  } catch (error) {
    // put back what was written, so the receipt and the invoices never disagree
    await restoreInvoices(written.map((row) => ({ orderId: row.order._id, amount: row.amount })), field);
    await CustomerPayment.deleteOne({ _id: payment._id });
    throw error;
  }

  return payment;
}

async function restoreInvoices(shares, field) {
  for (const share of shares) {
    const order = await POSOrder.findById(share.orderId).select(field).lean();

    if (!order) continue;

    await POSOrder.updateOne(
      { _id: order._id },
      {
        $inc: { dueAmount: share.amount },
        $set: { [field]: round(Math.max(0, (Number(order[field]) || 0) - share.amount)) },
      },
    );
  }
}

/** Deletes a receipt and puts its shares back on the invoices */
export async function deleteCustomerPayment(payment) {
  if (payment.type === "advance") {
    const customer = await CustomerModel.findById(payment.customerId).lean();
    const balance = customer ? await customerBalance(customer) : null;

    if (balance && balance.advance - payment.amount < -0.009) {
      throw new Error("Part of this advance was already refunded; delete that refund first");
    }
  }

  const field = payment.type === "receive" ? "paidAmount" : payment.type === "dismiss" ? "dismissAmount" : null;

  if (field) await restoreInvoices(payment.allocations, field);

  payment.deletedAt = new Date();
  await payment.save();
}

/** Checks the admin customer form; shared by create and update */
export function readCustomer(body) {
  const name = String(body.name || "").trim().slice(0, 120);
  const phone = String(body.phone || "").replace(/[\s-]/g, "");
  const email = String(body.email || "").trim().toLowerCase().slice(0, 160);
  const money = (value) => Math.max(0, round(value));
  const openingDate = body.openingDate ? new Date(body.openingDate) : null;

  if (name.length < 2) return { error: "Enter the customer's name" };
  if (!/^01\d{9}$/.test(phone)) return { error: "Mobile must be 01XXXXXXXXX" };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email" };
  if (openingDate && Number.isNaN(openingDate.getTime())) return { error: "The date is invalid" };

  return {
    data: {
      name,
      phone,
      email,
      businessName: String(body.businessName || "").trim().slice(0, 160),
      address: String(body.address || "").trim().slice(0, 300),
      note: String(body.note || "").trim().slice(0, 2000),
      openingDue: money(body.openingDue),
      initialAdvance: money(body.initialAdvance),
      openingDate,
      isActive: body.isActive !== false,
    },
  };
}
