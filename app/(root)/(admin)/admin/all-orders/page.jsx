"use client";

import React, { useMemo, useCallback } from "react";
import Link from "next/link";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import DatatableWrapperr from "@/components/ui/Application/Admin/DatatableWrapperr";
import EditAction from "@/components/ui/Application/Admin/EditAction";
import DeleteAction from "@/components/ui/Application/Admin/DeleteAction";

import {

  ADMIN_DASHBOARD,
  ADMIN_COUPON_ADD,
  ADMIN_COUPON_EDIT,
  ADMIN_TRASH,
  ADMIN_COUPON_SHOW,
  ADMIN_ORDER_SHOW,
  ADMIN_ORDER_EDIT,
  ADMIN_ORDER_DETAILS,
} from "@/Route/Adminpannelroute";

import { DT_COUPON_COLUMN, DT_coupon_COLUMN, DT_ORDER_COLUMN } from "@/lib/column";
import { columnConfig } from "@/lib/helperfunction";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { FiPlus } from "react-icons/fi";
import ViewAction from "@/components/ui/Application/Admin/ViewAction";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_COUPON_SHOW, label: "Category" },
];

const ShowOrder = () => {
  // ✅ columns config
  const columns = useMemo(() => {
    return columnConfig(DT_ORDER_COLUMN);
  }, []);

  // ✅ row action menu
  const action = useCallback(
    (row, deleteType, handleDelete) => {
      const actionMenu = [];

      actionMenu.push(
        <ViewAction
          key="view"
          href={ADMIN_ORDER_DETAILS(row.original.orderNumber)}
        />
      );


       actionMenu.push(
        <EditAction
          key="edit"
          href={ADMIN_ORDER_EDIT(row.original._id)}
        />
      );

      actionMenu.push(
        <DeleteAction
          key="delete"
          row={row}
          deleteType={deleteType}
          handleDelete={handleDelete}
        />
      );

      return actionMenu;
    },
    []
  );

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-row items-center justify-between">
          <h4 className="text-xl font-semibold">Orders</h4>

        
        </CardHeader>

        <CardContent className="pb-5">
          <DatatableWrapperr
            queryKey="orders-data"
            fetchUrl="/api/orders"
            initialPageSize={10}
            columnsConfig={columns}
            exportEndpoint="/api/orders/export"
            deleteEndpoint="/api/orders/delete"
            deleteType="SD"
            trashView={`${ADMIN_TRASH}?trashof=coupon`}
            createAction={action}
          />
        </CardContent>
      </Card> 
    </div>
  );
};

export default ShowOrder;
