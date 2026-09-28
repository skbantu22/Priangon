import { redirect } from "next/navigation";

import { ADMIN_APP_SETTINGS } from "@/Route/Adminpannelroute";

export default function ShowroomsRedirect() {
  redirect(ADMIN_APP_SETTINGS);
}
