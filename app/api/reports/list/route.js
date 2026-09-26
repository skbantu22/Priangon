import { NextResponse } from "next/server";

import { permissionsFor, requireRoles } from "@/lib/apiAuth";
import { REPORTS, REPORT_GROUPS } from "@/lib/reportEngine";

/** The reports this login may open, grouped the way the All Reports page shows them */
export async function GET() {
  try {
    const auth = await requireRoles([]);
    if (auth.response) return auth.response;

    const held = await permissionsFor(auth);

    const data = Object.entries(REPORTS)
      .filter(([, report]) => held.includes(report.permission))
      .map(([key, report]) => ({ key, title: report.title, group: report.group }));

    return NextResponse.json({ success: true, data, groups: REPORT_GROUPS });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
