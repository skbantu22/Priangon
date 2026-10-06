import { redirect } from "next/navigation";

// the partner home is the product list; the dashboard has its own page
export default function PartnerHome() {
  redirect("/partner/products");
}
