"use client"
import React from 'react'
import Themeswitch from './Themeswitch'
import UserDropDown from './UserDropDown'
import { RiMenu4Fill } from "react-icons/ri";
import { Button } from '@/components/ui/button';
import AdminSearch from './AdminSearch';
import { useSidebar } from '@/components/ui/sidebar';
import AdminMobileSearch from './AdminMobileSearch';

const Topbar = () => {





  const {toggleSidebar}= useSidebar();
  return (
  

  <div className="fixed border h-14 w-full top-0 left-0 z-30 md:ps-72 md:pe-8 px-5 flex justify-between items-center bg-white dark:bg-card">

 <div className="flex items-center md:hidden">
  <h1 className="text-lg font-semibold">
    Priangon<span className="text-primary">.</span>
  </h1>
</div>


  <div className='md:block hidden'>
     <AdminSearch />
  </div>

  <div className='flex items-center gap-2'>
    
    <AdminMobileSearch />

    <Themeswitch />

    <UserDropDown />
    <Button type="button" size="icon" className="ms-2 md:hidden" onClick={toggleSidebar}>
  <RiMenu4Fill />
</Button>
  </div>

</div>
  )
}

export default Topbar
