import mongoose from "mongoose";
import { REPAIR_STATUSES } from "@/models/RepairJob.model";

const money = (v) => Math.max(0, Math.round((Number(v) || 0) * 100) / 100);

/** Checks the repair form; shared by create and update */
export function readRepair(body) {
  const customerName = String(body.customerName || "").trim().slice(0, 120);
  const phone = String(body.phone || "").replace(/[\s-]/g, "");
  const device = String(body.device || "").trim().slice(0, 160);
  const issue = String(body.issue || "").trim().slice(0, 500);

  if (customerName.length < 2) return { error: "Enter the customer's name" };
  if (phone && !/^01\d{9}$/.test(phone)) return { error: "Mobile must be 01XXXXXXXXX" };
  if (!device) return { error: "Enter the phone model" };
  if (!issue) return { error: "Describe the problem" };

  const parts = (Array.isArray(body.parts) ? body.parts : [])
    .map((p) => ({ name: String(p?.name || "").trim().slice(0, 120), price: money(p?.price) }))
    .filter((p) => p.name);

  const serviceCharge = money(body.serviceCharge);
  const total = money(serviceCharge + parts.reduce((s, p) => s + p.price, 0));
  const paid = money(body.paid);

  const status = REPAIR_STATUSES.includes(body.status) ? body.status : "received";
  const date = (v) => {
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  };

  return {
    data: {
      customerName,
      phone,
      device,
      imei: String(body.imei || "").trim().slice(0, 40),
      issue,
      accessories: String(body.accessories || "").trim().slice(0, 300),
      note: String(body.note || "").trim().slice(0, 2000),
      status,
      technicianId: mongoose.isValidObjectId(body.technicianId) ? body.technicianId : null,
      technicianName: String(body.technicianName || "").trim().slice(0, 120),
      estimate: money(body.estimate),
      serviceCharge,
      parts,
      total,
      paid,
      due: money(total - paid),
      receivedAt: date(body.receivedAt) || new Date(),
      expectedAt: date(body.expectedAt),
    },
  };
}
