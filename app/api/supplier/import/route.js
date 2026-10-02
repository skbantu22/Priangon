import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";

import SupplierModel from "@/models/Supplier.model";
import ShowroomModel from "@/models/Showroom.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";
import { exactRegex } from "@/lib/escapeRegex";

/** The column names the sample file uses, lowercased and stripped */
const KEY = (value) => String(value || "").toLowerCase().replace(/[^a-z]/g, "");

const FIELDS = {
  name: "name",
  businessname: "companyName",
  companyname: "companyName",
  mobile: "phone",
  phone: "phone",
  email: "email",
  address: "address",
  area: "area",
  branch: "branch",
  openingbalance: "openingBalance",
  due: "openingBalance",
  initialadvance: "initialAdvance",
  advance: "initialAdvance",
  srname: "srName",
  srmobile: "srMobile",
  dsrname: "dsrName",
  dsrmobile: "dsrMobile",
  note: "note",
};

/**
 * Bulk supplier upload.
 *
 * The browser reads the spreadsheet and sends plain rows, so a column
 * the shop renamed is still understood as long as it means the same
 * thing. A row that already exists (same name and mobile) is updated
 * rather than duplicated, and a row that cannot be read is reported back
 * by its line number instead of stopping the rest.
 */
export async function POST(req) {
  try {
    const auth = await requireRoles(ADMIN_ONLY);
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "The file has no rows" },
        { status: 400 },
      );
    }

    if (rows.length > 2000) {
      return NextResponse.json(
        { success: false, message: "Import at most 2000 suppliers at a time" },
        { status: 400 },
      );
    }

    // Branches can be named in the file rather than given by id
    const branches = await ShowroomModel.find().select("name").lean();

    const branchByName = new Map(
      branches.map((branch) => [branch.name.trim().toLowerCase(), String(branch._id)]),
    );

    let created = 0;
    let updated = 0;
    const errors = [];

    for (const [index, raw] of rows.entries()) {
      const line = index + 2; // the header is line 1 in the file

      const row = {};

      for (const [column, value] of Object.entries(raw || {})) {
        const field = FIELDS[KEY(column)];

        if (field) row[field] = typeof value === "string" ? value.trim() : value;
      }

      const name = String(row.name || "").trim();
      const phone = String(row.phone || "").trim();

      if (!name || !phone) {
        errors.push(`Line ${line}: name and mobile are both needed`);
        continue;
      }

      if (!/^01\d{9}$/.test(phone)) {
        errors.push(`Line ${line}: "${phone}" is not a Bangladeshi mobile number`);
        continue;
      }

      const branchValue = String(row.branch || "").trim();

      const showroomId = isValidObjectId(branchValue)
        ? branchValue
        : branchByName.get(branchValue.toLowerCase()) || null;

      if (branchValue && !showroomId && branchValue.toLowerCase() !== "ware house") {
        errors.push(`Line ${line}: no branch called "${branchValue}"`);
        continue;
      }

      const fields = {
        name,
        phone,
        companyName: String(row.companyName || "").trim(),
        email: String(row.email || "").trim(),
        address: String(row.address || "").trim(),
        area: String(row.area || "").trim(),
        showroomId,
        openingBalance: Number(row.openingBalance) || 0,
        initialAdvance: Math.max(0, Number(row.initialAdvance) || 0),
        srName: String(row.srName || "").trim(),
        srMobile: String(row.srMobile || "").trim(),
        dsrName: String(row.dsrName || "").trim(),
        dsrMobile: String(row.dsrMobile || "").trim(),
        note: String(row.note || "").trim(),
      };

      try {
        const existing = await SupplierModel.findOne({
          name: exactRegex(name),
          phone,
        });

        if (existing) {
          if (existing.deletedAt) {
            errors.push(`Line ${line}: "${name}" is in the trash — restore it first`);
            continue;
          }

          // An opening balance is a one-off: re-importing the same sheet
          // must not keep adding what the supplier was owed on day one
          const { openingBalance, initialAdvance, ...rest } = fields;

          Object.assign(existing, rest);
          await existing.save();

          updated += 1;
        } else {
          await SupplierModel.create(fields);
          created += 1;
        }
      } catch (rowError) {
        errors.push(`Line ${line}: ${rowError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${created} added, ${updated} updated${errors.length ? `, ${errors.length} skipped` : ""}`,
      created,
      updated,
      skipped: errors.length,
      errors: errors.slice(0, 50),
    });
  } catch (error) {
    console.error("SUPPLIER IMPORT ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Could not import suppliers" },
      { status: 500 },
    );
  }
}
