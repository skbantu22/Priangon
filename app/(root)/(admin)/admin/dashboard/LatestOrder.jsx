'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import useFetch from "@/hooks/useFetch"
import { useEffect, useState } from "react"
import Image from "next/image"
import notFound from '@/public/assets/not-found.png'
import { statusBadge } from "@/lib/helperfunction"

const LatestOrder = () => {
  const [latestOrder, setLatestOrder] = useState([])
  const { data, loading } = useFetch('/api/dashboard/admin/latest-order')

  console.log(data)

  useEffect(() => {
    if (data?.success) {
      setLatestOrder(data.data)
    }
  }, [data])

  if (loading)
    return (
      <div className="h-full w-full flex justify-center items-center">
        Loading...
      </div>
    )

  if (!latestOrder.length)
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Image src={notFound} alt="No order" width={120} />
        <p className="text-gray-500 mt-2">No latest orders found</p>
      </div>
    )

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order Id</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Total Item</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Amount</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {latestOrder.map((order) => (
          <TableRow key={order._id} className="hover:bg-muted/50">
            
            <TableCell>{order.orderNumber}</TableCell>

            <TableCell>
              {order.paymentMethodSelected?.toUpperCase() || "N/A"}
            </TableCell>

            <TableCell>{order.items?.length || 0}</TableCell>

            <TableCell>{statusBadge(order.status)}</TableCell>

            <TableCell>৳{order.total}</TableCell>

          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default LatestOrder