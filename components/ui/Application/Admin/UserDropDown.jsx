"use client"
import React from 'react'
import { useSelector } from 'react-redux'
import Link from 'next/link'
import { IoShirtOutline } from 'react-icons/io5'
import { MdOutlineShoppingBag } from 'react-icons/md'

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import LogoutButton from './LogoutButton'

const UserDropDown = ({ showDetails = false }) => {
  // Extract user data from Redux
  const user = useSelector((store) => store.authStore.auth?.user || store.authStore.auth?.data?.user);

  // Helper to get Initials (e.g., "John Doe" -> "JD")
  const getInitials = (name) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) return null; // Or a Login button

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={
              showDetails
                ? "h-11 gap-2.5 rounded-lg px-1.5 text-white hover:bg-white/10 hover:text-white"
                : "relative h-10 w-10 rounded-full"
            }
          >
            <span className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={user?.image || user?.avatar?.url || user?.avatar}
                  alt={user?.name || "User"}
                />
                <AvatarFallback className="bg-white/90 font-semibold text-primary">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              {/* Online Status Badge */}
              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-600 ring-2 ring-white" />
            </span>

            {showDetails && (
              <span className="hidden lg:flex flex-col items-start leading-tight">
                <span className="text-sm font-semibold">{user?.name}</span>
                <span className="text-[11px] font-normal capitalize text-white/70">
                  {user?.role}
                </span>
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user?.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href="/admin/new-product" className="flex w-full items-center gap-2 cursor-pointer">
              <IoShirtOutline className="h-4 w-4" />
              <span>New Product</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/orders" className="flex w-full items-center gap-2 cursor-pointer">
              <MdOutlineShoppingBag className="h-4 w-4" />
              <span>Orders</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          
          {/* Ensure LogoutButton renders a DropdownMenuItem internally or wrap it */}
          <LogoutButton />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default UserDropDown