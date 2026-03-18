"use client"
import React, { useState } from 'react'
import { Input } from '../../input'
import SearchModel from './SearchModel'

const AdminSearch = () => {
    const [open, setOpen] = useState(false);

  return (
    <div className='md:w-[350px]'>
  <div>
    <Input
      readOnly
      className="rounded-full cursor-pointer"
      placeholder="Search..."
      onClick={() => setOpen(true)}
    />
  </div>

  <SearchModel open={open} setOpen={setOpen} />
</div>
  )
}

export default AdminSearch
