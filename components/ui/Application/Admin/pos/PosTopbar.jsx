"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RiMenu4Fill } from "react-icons/ri";
import {
  Search,
  X,
  PauseCircle,
  History,
  Repeat,
  Maximize,
  Minimize,
  Trash2,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UserDropDown from "../UserDropDown";

const topButton =
  "flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition";

export default function PosTopbar({
  search,
  setSearch,
  inputRef,
  onSearchKeyDown,
  heldSales = [],
  onRestoreHeld,
  onDeleteHeld,
  onExchange,
}) {
  const { toggleSidebar } = useSidebar();
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    <header className="flex h-16 shrink-0 items-center gap-3 bg-sidebar px-3 text-white shadow-md">
      <button
        type="button"
        onClick={toggleSidebar}
        title="Toggle menu"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-white/10"
      >
        <RiMenu4Fill className="size-5" />
      </button>

      {/* SEARCH / BARCODE */}
      <div className="flex h-10 min-w-0 flex-1 max-w-2xl items-center overflow-hidden rounded-lg bg-white">
        <Search className="ml-3 size-4 shrink-0 text-gray-400" />
        <input
          ref={inputRef}
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder="Search or scan barcode..."
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
        {search ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              inputRef?.current?.focus();
            }}
            className="mr-2 text-gray-400 hover:text-gray-600"
          >
            <X className="size-4" />
          </button>
        ) : (
          <kbd className="mr-2 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary max-sm:hidden">
            F1
          </kbd>
        )}
        <span className="flex h-full w-11 shrink-0 items-center justify-center bg-primary">
          <Search className="size-5 text-white" />
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* HELD SALES */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button type="button" className={`${topButton} relative`}>
              <PauseCircle className="size-5" />
              <span className="hidden lg:inline">Hold Sale</span>
              {heldSales.length > 0 && (
                <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-gray-900">
                  {heldSales.length}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Held sales</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {heldSales.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No sales on hold. Press F3 to hold the current cart.
              </p>
            ) : (
              heldSales.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                >
                  <button
                    type="button"
                    onClick={() => onRestoreHeld(h.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="text-sm font-semibold">
                      ৳ {Number(h.total || 0).toLocaleString()}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        · {h.cart.length} items
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(h.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteHeld(h.id)}
                    title="Remove"
                    className="rounded p-1 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <button type="button" onClick={onExchange} className={topButton}>
          <Repeat className="size-5" />
          <span className="hidden lg:inline">Exchange (F6)</span>
        </button>

        <Link href="/admin/all-orders/pos-orders" className={`${topButton} max-sm:hidden`}>
          <History className="size-5" />
          <span className="hidden lg:inline">Recent Sales</span>
        </Link>

        <button
          type="button"
          onClick={toggleFullscreen}
          title="Fullscreen"
          className={`${topButton} max-sm:hidden`}
        >
          {isFullscreen ? (
            <Minimize className="size-5" />
          ) : (
            <Maximize className="size-5" />
          )}
        </button>

        <UserDropDown showDetails />
      </div>
    </header>
  );
}
