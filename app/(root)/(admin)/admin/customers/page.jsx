"use client";

import React, { useMemo, useCallback } from "react";
import Link from "next/link";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import DatatableWrapperr from "@/components/ui/Application/Admin/DatatableWrapperr";
import EditAction from "@/components/ui/Application/Admin/EditAction";
import DeleteAction from "@/components/ui/Application/Admin/DeleteAction";

import {

  ADMIN_DASHBOARD,
  

  ADMIN_TRASH,
 
} from "@/Route/Adminpannelroute";

import {  DT_CUSTOMERS_COLUMN } from "@/lib/column";
import { columnConfig } from "@/lib/helperfunction";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";


const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: '', label: "Customer" },
];

const ShowCustomers = () => {
  // ✅ columns config
  const columns = useMemo(() => {
    return columnConfig(DT_CUSTOMERS_COLUMN);
  }, []);

  // ✅ row action menu
  const action = useCallback(
    (row, deleteType, handleDelete) => {
      const actionMenu = [];

      

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
          <h4 className="text-xl font-semibold">Show Customers</h4>

          
        </CardHeader>

        <CardContent className="pb-5">
          <DatatableWrapperr
            queryKey="customers-data"
            fetchUrl="/api/customers"
            initialPageSize={10}
            columnsConfig={columns}
            exportEndpoint="/api/customers/export"
            deleteEndpoint="/api/customers/delete"
            deleteType="SD"
            trashView={`${ADMIN_TRASH}?trashof=customers`}
            createAction={action}
          />
        </CardContent>
      </Card> 
    </div>
  );
};

export default ShowCustomers;
