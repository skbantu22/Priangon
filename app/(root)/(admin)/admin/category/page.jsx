"use client";

import React, { useMemo, useCallback } from "react";
import Link from "next/link";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import DatatableWrapperr from "@/components/ui/Application/Admin/DatatableWrapperr";
import EditAction from "@/components/ui/Application/Admin/EditAction";
import DeleteAction from "@/components/ui/Application/Admin/DeleteAction";

import {
  ADMIN_CATEGORY_ADD,
  ADMIN_CATEGORY_EDIT,
  ADMIN_CATEGORY_SHOW,
  ADMIN_DASHBOARD,
  ADMIN_TRASH,
} from "@/Route/Adminpannelroute";

import { DT_CATEGORY_COLUMN } from "@/lib/column";
import { columnConfig } from "@/lib/helperfunction";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { FiPlus } from "react-icons/fi";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_CATEGORY_SHOW, label: "Category" },
];

const ShowCategory = () => {
  // ✅ columns config
  const columns = useMemo(() => {
    return columnConfig(DT_CATEGORY_COLUMN);
  }, []);

  // ✅ row action menu
  const action = useCallback(
    (row, deleteType, handleDelete) => {
      const actionMenu = [];

      actionMenu.push(
        <EditAction
          key="edit"
          href={ADMIN_CATEGORY_EDIT(row.original._id)}
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
          <h4 className="text-xl font-semibold">Show Category</h4>

          <Button asChild>
            <Link href={ADMIN_CATEGORY_ADD}>
              <FiPlus className="mr-2" />
              New Category
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="pb-5">
          <DatatableWrapperr
            queryKey="category-data"
            fetchUrl="/api/category"
            initialPageSize={10}
            columnsConfig={columns}
            exportEndpoint="/api/category/export"
            deleteEndpoint="/api/category/delete"
            deleteType="SD"
            trashView={`${ADMIN_TRASH}?trashof=category`}
            createAction={action}
          />
        </CardContent>
      </Card> 
    </div>
  );
};

export default ShowCategory;
