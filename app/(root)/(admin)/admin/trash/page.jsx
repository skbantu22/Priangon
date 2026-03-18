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

import { DT_CATEGORY_COLUMN, DT_COUPON_COLUMN, DT_CUSTOMERS_COLUMN, DT_PRODUCT_COLUMN, DT_PRODUCT_VARIANT_COLUMN } from "@/lib/column";
import { columnConfig } from "@/lib/helperfunction";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { FiPlus } from "react-icons/fi";
import { useSearchParams } from "next/navigation";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_TRASH, label: "Trash" },
];

const TRASH_CONFIG = {
  category: {
    title: 'Category Trash',
    columns: DT_CATEGORY_COLUMN,
    fetchUrl: '/api/category',
    exportUrl: '/api/category/export',
    deleteUrl: '/api/category/delete'
  },

  product: {
  title: 'Product Trash',
  columns: DT_PRODUCT_COLUMN,
  fetchUrl: '/api/product',
  exportUrl: '/api/product/export',
  deleteUrl: '/api/product/delete'
},

"product-variant": {
  title: 'Product Variant Trash',
  columns: DT_PRODUCT_VARIANT_COLUMN,
  fetchUrl: '/api/product-variant',
  exportUrl: '/api/product-variant/export',
  deleteUrl: '/api/product-variant/delete'
},

coupon: {
  title: 'Coupon Trash',
  columns: DT_COUPON_COLUMN,
  fetchUrl: '/api/coupon',
  exportUrl: '/api/coupon/export',
  deleteUrl: '/api/coupon/delete'
},
customers: {
  title: 'Customers Trash',
  columns: DT_CUSTOMERS_COLUMN,
  fetchUrl: '/api/customers',
  exportUrl: '/api/customers/export',
  deleteUrl: '/api/customers/delete'
}

}

const Trash = () => {
  // ✅ columns config

  const searchParams = useSearchParams()
const trashOf = searchParams.get('trashof')


const config = TRASH_CONFIG[trashOf]

const columns = useMemo(() => {
  return columnConfig(config.columns, false, false, true)
}, [])


  // ✅ row action menu
  
const action = useCallback((row, deleteType, handleDelete) => {
  return [
    <DeleteAction
      key="delete"
      handleDelete={handleDelete}
      row={row}
      deleteType={deleteType}
    />
  ]
}, [])

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-row items-center justify-between">
          <h4 className="text-xl font-semibold">{config.title}</h4>

          
        </CardHeader>

        <CardContent className="pb-5">
         <DatatableWrapperr
  queryKey={`${trashOf}-data-deleted`}
  fetchUrl={config.fetchUrl}
  initialPageSize={10}
  columnsConfig={columns}
  exportEndpoint={config.exportUrl}
  deleteEndpoint={config.deleteUrl}
  deleteType="PD"
  createAction={action}
/>

        </CardContent>
      </Card> 
    </div>
  );
};

export default Trash;
