import Link from 'next/link'
import React from 'react'
import { BiCategory } from "react-icons/bi";
import { IoShirtOutline } from "react-icons/io5";
import { MdOutlineShoppingBag } from "react-icons/md";
import { LuUserRound } from "react-icons/lu";
import { ADMIN_CATEGORY_ADD, ADMIN_MEDIA_SHOW, ADMIN_PRODUCT_ADD } from '@/Route/Adminpannelroute';

const QuickAdd = () => {
  return (
    <div className='grid lg:grid-cols-4 sm:grid-cols-2 sm:gap-10 gap-5 mt-10'>

  <Link href={ADMIN_CATEGORY_ADD}>
    <div className='flex items-center justify-between p-3 rounded-lg shadow bg-white dark:bg-card bg-gradient-to-tr from-green-400 via-green-500 to-green-600'>

      <h4 className='font-medium text-white dark:text-black'>
        Add Category
      </h4>

      <span className='w-12 h-12 border dark:border-green-800 flex justify-center items-center rounded-full text-white'>
        <BiCategory size={20} />
      </span>

    </div>
  </Link>

 <Link href={ADMIN_PRODUCT_ADD}>
    <div className='flex items-center justify-between p-3 rounded-lg shadow bg-white dark:bg-card bg-gradient-to-tr from-green-400 via-green-500 to-green-600'>

      <h4 className='font-medium text-white dark:text-black'>
        Add PRoduct
      </h4>

      <span className='w-12 h-12 border dark:border-green-800 flex justify-center items-center rounded-full text-white'>
        <BiCategory size={20} />
      </span>

    </div>
  </Link>
   <Link href={ADMIN_CATEGORY_ADD}>
    <div className='flex items-center justify-between p-3 rounded-lg shadow bg-white dark:bg-card bg-gradient-to-tr from-green-400 via-green-500 to-green-600'>

      <h4 className='font-medium text-white dark:text-black'>
        Add Coupon
      </h4>

      <span className='w-12 h-12 border dark:border-green-800 flex justify-center items-center rounded-full text-white'>
        <BiCategory size={20} />
      </span>

    </div>
  </Link>
   <Link href={ADMIN_MEDIA_SHOW}>
    <div className='flex items-center justify-between p-3 rounded-lg shadow bg-white dark:bg-card bg-gradient-to-tr from-green-400 via-green-500 to-green-600'>

      <h4 className='font-medium text-white dark:text-black'>
       Upload Mrdia
      </h4>

      <span className='w-12 h-12 border dark:border-green-800 flex justify-center items-center rounded-full text-white'>
        <BiCategory size={20} />
      </span>

    </div>
  </Link>
</div>
  )
}

export default QuickAdd