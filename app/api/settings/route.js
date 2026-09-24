import { NextResponse } from "next/server";

import SettingModel, { getSettings } from "@/models/Setting.model";
import { connectDB } from "@/lib/databaseconnection";
import { isValidBIN, isValidTIN, isValidBdMobile } from "@/lib/bdFormat";

export async function GET() {
  try {
    await connectDB();

    const settings = await getSettings();

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

// Only these may be written from the browser; anything else is ignored
const EDITABLE = [
  "companyName",
  "logo",
  "address",
  "phone",
  "email",
  "website",
  "bin",
  "tin",
  "tradeLicenseNo",
  "vatEnabled",
  "vatRate",
  "vatInclusive",
  "mushakFormNo",
  "showMushakLine",
  "invoiceFooter",
  "showAmountInWords",
  "warrantyTerms",
  "numberDigits",
  "fiscalYearStartMonth",
  "weekendDays",
  "lowStockAlert",
  "allowNegativeStock",
  "enforceImeiCheck",
  "supportPhone",
  "supportEmail",
  "maintenanceMode",
  "maintenanceMessage",
  "updatedBy",
];

export async function PUT(req) {
  try {
    await connectDB();

    const body = await req.json();

    // NBR identifiers are checked when filled in, because a wrong BIN on
    // a printed challan is worse than a blank one
    if (body.bin && !isValidBIN(body.bin)) {
      return NextResponse.json(
        { success: false, message: "BIN must be 13 digits" },
        { status: 400 },
      );
    }

    if (body.tin && !isValidTIN(body.tin)) {
      return NextResponse.json(
        { success: false, message: "e-TIN must be 12 digits" },
        { status: 400 },
      );
    }

    for (const field of ["phone", "supportPhone"]) {
      if (body[field] && !isValidBdMobile(body[field])) {
        return NextResponse.json(
          {
            success: false,
            message: `${field === "phone" ? "Phone" : "Support phone"} must be a Bangladeshi mobile number (01XXXXXXXXX)`,
          },
          { status: 400 },
        );
      }
    }

    if (body.vatEnabled) {
      const rate = Number(body.vatRate);

      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return NextResponse.json(
          { success: false, message: "VAT rate must be between 0 and 100" },
          { status: 400 },
        );
      }
    }

    const update = {};

    for (const field of EDITABLE) {
      if (field in body) update[field] = body[field];
    }

    const settings = await SettingModel.findOneAndUpdate(
      { key: "general" },
      update,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json({
      success: true,
      message: "Settings saved",
      data: settings,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
