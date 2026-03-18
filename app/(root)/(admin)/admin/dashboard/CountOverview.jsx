"use client";
import useFetch from '@/hooks/useFetch'
import { ADMIN_CATEGORY_SHOW, ADMIN_PRODUCT_SHOW } from '@/Route/Adminpannelroute';
import Link from 'next/link'
import React from 'react'
import { BiCategory } from 'react-icons/bi'

const countOverview = () => {
    const { data: countData } = useFetch('/api/dashboard/admin/count')
console.log(countData)
  return (
  <div className='grid lg:grid-cols-4 sm:grid-cols-2 sm:gap-10 gap-5'>
  <Link href={ADMIN_CATEGORY_SHOW}>
    <div className='flex items-center justify-between p-3 rounded-lg border shadow border-l-4 border-l-green-400 bg-white dark:bg-card dark:border-gray-800 dark:border-l-green-400'>
      
      <div>
        <h4 className='font-medium text-gray-500'>Total Categories</h4>
        <span className='text-xl font-bold'>{countData?.data?.category ?? 0}</span>
      </div>

      <div>
        <span className='w-12 h-12 border flex justify-center items-center rounded-full bg-green-500 text-white'>
          <BiCategory />
        </span>
      </div>

    </div>
  </Link>
   <Link href={ADMIN_PRODUCT_SHOW}>
    <div className='flex items-center justify-between p-3 rounded-lg border shadow border-l-4 border-l-green-400 bg-white dark:bg-card dark:border-gray-800 dark:border-l-green-400'>
      
      <div>
        <h4 className='font-medium text-gray-500'>Total Products</h4>
        <span className='text-xl font-bold'>{countData?.data?.product ?? 0}</span>
      </div>

      <div>
        <span className='w-12 h-12 border flex justify-center items-center rounded-full bg-green-500 text-white'>
          <BiCategory />
        </span>
      </div>

    </div>
  </Link>
   <Link href="">
    <div className='flex items-center justify-between p-3 rounded-lg border shadow border-l-4 border-l-green-400 bg-white dark:bg-card dark:border-gray-800 dark:border-l-green-400'>
      
      <div>
        <h4 className='font-medium text-gray-500'>Total Orders</h4>
        <span className='text-xl font-bold'>{countData?.data?.order ?? 0}</span>
      </div>

      <div>
        <span className='w-12 h-12 border flex justify-center items-center rounded-full bg-green-500 text-white'>
          <BiCategory />
        </span>
      </div>

    </div>
  </Link>
   <Link href="">
    <div className='flex items-center justify-between p-3 rounded-lg border shadow border-l-4 border-l-green-400 bg-white dark:bg-card dark:border-gray-800 dark:border-l-green-400'>
      
      <div>
        <h4 className='font-medium text-gray-500'>Total Customer</h4>
        <span className='text-xl font-bold'>{countData?.data?.customer ?? 0}</span>
      </div>

      <div>
        <span className='w-12 h-12 border flex justify-center items-center rounded-full bg-green-500 text-white'>
          <BiCategory />
        </span>
      </div>

    </div>
  </Link>
</div>


  )
}

export default countOverview
