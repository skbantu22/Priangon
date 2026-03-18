"use client"
import React from 'react'

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from 'next-themes'
import { IoMoonOutline, IoSunnyOutline } from 'react-icons/io5'
const Themeswitch = () => {

  const { setTheme } = useTheme()
  return (
    <DropdownMenu modal={false} >
  <DropdownMenuTrigger asChild>
  

  <Button type="button" variant="ghost" className="cursor-pointer">
  <IoSunnyOutline className="dark:hidden" />
  <IoMoonOutline className="hidden dark:block" />
</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    
      <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
     <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
     <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>

    
  </DropdownMenuContent>
</DropdownMenu>

  )
}

export default Themeswitch
