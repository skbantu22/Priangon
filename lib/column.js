import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Chip } from "@mui/material";

import dayjs from "dayjs"
export const DT_CATEGORY_COLUMN = [
  {
    accessorKey: "name",
    header: "Category Name",
  },
  {
    accessorKey: "slug",
    header: "Slug",
  },
];
export const DT_PRODUCT_COLUMN = [
  {
    accessorKey: "name",
    header: "Product Name",
  },
  {
    accessorKey: "slug",
    header: "Slug",
  },

  {
  accessorKey: 'category',
  header: 'Category',
},

{
  accessorKey: 'mrp',
  header: 'MRP',
},
{
  accessorKey: 'sellingPrice',
  header: 'Selling Price',
},
{
  accessorKey: 'discountPercentage',
  header: 'Discount Percentage',
},];
export const DT_PRODUCT_VARIANT_COLUMN= [
 {
  accessorKey: 'product',
  header: 'Product Name',
},
{
  accessorKey: 'color',
  header: 'Color',
},
{
  accessorKey: 'size',
  header: 'Size',
},
{
  accessorKey: "description",
  header: "Description",
},
{
  accessorKey: 'sku',
  header: 'SKU',
},

{
  accessorKey: 'mrp',
  header: 'MRP',
},
{
  accessorKey: 'sellingPrice',
  header: 'Selling Price',
},
{
  accessorKey: 'discountPercentage',
  header: 'Discount Percentage',
},];




export const DT_COUPON_COLUMN = [
  {
    accessorKey: 'code',
    header: 'Code',
  },

  {
    accessorKey: 'discountPercentage',
    header: 'Discount Percentage',
  },

  {
    accessorKey: 'minShoppingAmount',
    header: 'Min Shopping Amount',
  },

  {
    accessorKey: 'validity',
    header: 'Validity',
    
Cell: ({ renderedCellValue }) => (
  new Date() > new Date(renderedCellValue)
    ? (
        <Chip
          color="error"
          label={new Date(renderedCellValue).toLocaleDateString('en-BD')}
        />
      )
    : (
        <Chip
          color="success"
          label={new Date(renderedCellValue).toLocaleDateString('en-BD')}
        />
      )
),


  }
];


export const DT_CUSTOMERS_COLUMN = [
  {
    accessorKey: 'avatar',
    header: 'Avatar',
    Cell: ({ renderedCellValue }) => (
      <Avatar>
        <AvatarImage src={renderedCellValue?.url || "/assets/user.png"} />
      </Avatar>
    ),
  },

  {
  accessorKey: 'name',
  header: 'Name',
},
{
  accessorKey: 'email',
  header: 'Email',
},
{
  accessorKey: 'phone',
  header: 'Phone',
},
{
  accessorKey: 'address',
  header: 'Address',
},
{
  accessorKey: 'isEmailVerified',
  header: 'Is Verified',
  Cell: ({ renderedCellValue }) => (
    renderedCellValue
      ? <Chip color="success" label="Verified" />
      : <Chip color="error" label="Not Verified" />
  )
},

]


export const DT_ORDER_COLUMN = [
  {
    accessorKey: "orderNumber",
    header: "Order ID",
  },

  {
    accessorKey: "customer.name",
    header: "Name",
  },

  {
    accessorKey: "customer.phone",
    header: "Phone",
  },

  {
    accessorKey: "customer.address",
    header: "Address",
  },

  {
    accessorKey: "items",
    header: "Total Item",
    Cell: ({ row }) => (
      <span>{row.original.items?.length || 0}</span>
    ),
  },

  {
    accessorKey: "subtotal",
    header: "Subtotal",
  },

{
  accessorKey: 'discount',
  header: 'Discount',
  Cell: ({ renderedCellValue }) => <span>{Math.round(renderedCellValue)}</span>,
},
 {
  accessorKey: "coupon.discountPercentage",
  header: "Coupon Discount (%)",
},
  {
    accessorKey: "total",
    header: "Total Amount",
  },

  {
    accessorKey: "status",
    header: "Status",
  },
];