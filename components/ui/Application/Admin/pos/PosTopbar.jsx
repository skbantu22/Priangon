"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PauseCircle,
  History,
  Maximize,
  Minimize,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IoPersonCircleOutline } from "react-icons/io5";
import ProfilePanel from "../ProfilePanel";
import { holdDisplayTitle } from "@/lib/posHeldSales";

const iconButton =
  "flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg px-2 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition";

/** Mobile-only POS utilities. Desktop is full-screen without this bar. */
export default function PosTopbar({
  heldSales = [],
  onRestoreHeld,
  onDeleteHeld,
  till,
  branches = [],
  saleCenterName,
  onTillChange,
  canSwitchTill = false,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <header className="flex shrink-0 items-center gap-2 bg-sidebar px-2 py-1.5 text-white shadow-md lg:hidden">
      {canSwitchTill ? (
        <select
          value={till || ""}
          onChange={(event) => onTillChange?.(event.target.value)}
          title="Branch"
          className="h-10 max-w-[140px] truncate rounded-lg bg-white px-2 text-sm font-bold text-gray-900"
        >
          {branches.map((branch) => (
            <option key={branch._id} value={String(branch._id)}>
              {branch.name}
            </option>
          ))}
        </select>
      ) : (
        <span className="max-w-[120px] truncate text-sm font-bold">
          {saleCenterName || "Branch"}
        </span>
      )}

      <div className="ml-auto flex items-center gap-0.5">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button type="button" className={`${iconButton} relative`}>
              <PauseCircle className="size-5" />
              {heldSales.length > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-0.5 text-[9px] font-bold text-gray-900">
                  {heldSales.length}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="max-h-[min(70vh,24rem)] w-[min(calc(100vw-1.5rem),20rem)] overflow-y-auto"
          >
            <DropdownMenuLabel>Held sales (this shop)</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {heldSales.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                No holds here. Use Hold in the bottom bar or F3.
              </p>
            ) : (
              heldSales.map((h) => (
                <div
                  key={h.id}
                  className="flex items-stretch gap-2 rounded-md px-2 py-2 hover:bg-accent"
                >
                  <button
                    type="button"
                    onClick={() => onRestoreHeld(h.id)}
                    className="min-h-11 min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-semibold">{holdDisplayTitle(h)}</p>
                    <p className="text-sm font-semibold text-primary">
                      ৳{Number(h.total || 0).toLocaleString()}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteHeld(h.id)}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="size-5" />
                  </button>
                </div>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={toggleFullscreen}
          title="Fullscreen"
          className={iconButton}
        >
          {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
        </button>

        <Link href="/admin/sales" className={iconButton} title="Recent sales">
          <History className="size-5" />
        </Link>

        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          aria-label="Account"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10"
        >
          <IoPersonCircleOutline className="size-7" />
        </button>
        <ProfilePanel open={profileOpen} onOpenChange={setProfileOpen} />
      </div>
    </header>
  );
}
