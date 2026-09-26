import { redirect } from "next/navigation";

// The old System Settings page: its settings live in Business, Print and VAT now
export default function SystemSettingsPage() {
  redirect("/admin/settings");
}
