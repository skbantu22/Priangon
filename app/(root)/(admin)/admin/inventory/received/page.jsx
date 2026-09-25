"use client";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import TransferList from "@/components/ui/Application/Admin/inventory/TransferList";
import {
  ADMIN_DASHBOARD,
  ADMIN_INVENTORY_RECEIVED,
} from "@/Route/Adminpannelroute";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_INVENTORY_RECEIVED, label: "Received list" },
];

const ReceivedListPage = () => (
  <div>
    <BreadCrumb breadcrumbData={breadcrumbData} />

    <TransferList
      direction="received"
      title="Received list"
      description="Stock on its way in — count it before it becomes yours to sell"
    />
  </div>
);

export default ReceivedListPage;
