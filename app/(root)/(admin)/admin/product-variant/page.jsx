import { redirect } from "next/navigation";
import { ADMIN_PRODUCT_SHOW } from "@/Route/Adminpannelroute";

// Variants live on the product now: the Product List shows every variant,
// and each product's edit page manages its own
export default function ProductVariantRedirect() {
  redirect(ADMIN_PRODUCT_SHOW);
}
