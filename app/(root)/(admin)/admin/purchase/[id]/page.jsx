import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/apiAuth";
import { connectDB } from "@/lib/databaseconnection";
import { loadPurchaseDetail } from "@/lib/purchaseDetail";
import { getSettings } from "@/models/Setting.model";
import PurchaseViewClient from "./PurchaseViewClient";

export default async function PurchaseViewPage({ params, searchParams }) {
  const auth = await requirePermission("purchase.view");
  if (auth.response) redirect("/auth/login");

  const { id } = await params;
  const result = await loadPurchaseDetail(id, auth);

  if (!result.ok) {
    return (
      <p className="mx-auto max-w-[900px] rounded-[8px] bg-white p-6 text-center text-[#ff5b5b] shadow-sm" role="alert">
        {result.message}
      </p>
    );
  }

  await connectDB();
  const settings = await getSettings();
  const company = {
    name: settings.companyName || "",
    address: settings.address || "",
    phone: settings.phone || "",
    email: settings.email || "",
    logo: settings.logo || "",
    bin: settings.bin || "",
    mushakFormNo: settings.mushakFormNo || "",
    showMushakLine: !!settings.showMushakLine,
  };

  const query = await searchParams;
  const autoPrint = query?.print === "1";

  return <PurchaseViewClient purchase={result.data} company={company} autoPrint={autoPrint} />;
}
