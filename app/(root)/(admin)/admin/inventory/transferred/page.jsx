"use client";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import TransferList from "@/components/ui/Application/Admin/inventory/TransferList";
import {
  ADMIN_DASHBOARD,
  ADMIN_INVENTORY_TRANSFERRED,
} from "@/Route/Adminpannelroute";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_INVENTORY_TRANSFERRED, label: "Transferred list" },
];

const TransferredListPage = () => (
  <div>
    <BreadCrumb breadcrumbData={breadcrumbData} />

    <TransferList
      direction="sent"
      title="Transferred list"
      description="Stock sent out, and whether the other side has taken it in yet"
    />
  </div>
);

export default TransferredListPage;
