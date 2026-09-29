"use client";



import Link from "next/link";

import Image from "next/image";

import { useEffect, useState } from "react";

import sbtMark from "@/public/assets/sbt-mark.png";

import {

  ArrowLeftRight,

  Banknote,

  Calculator,

  ChevronLeft,

  ChevronRight,

  List,

  Monitor,

  Trash2,

} from "lucide-react";

import {

  DropdownMenu,

  DropdownMenuContent,

  DropdownMenuLabel,

  DropdownMenuSeparator,

  DropdownMenuTrigger,

} from "@/components/ui/dropdown-menu";

import { holdDisplayTitle } from "@/lib/posHeldSales";



const iconBtn =

  "flex size-9 shrink-0 items-center justify-center rounded-md text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-45 md:size-10";



const actionBtn =

  "flex h-9 min-w-0 shrink-0 items-center justify-center gap-1 rounded-md px-2 text-[10px] font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 md:h-10 md:px-3 md:text-xs";



export default function PosBottomActionBar({

  total = 0,

  onExchange,

  onHold,

  onClear,

  onPayment,

  cartEmpty = true,

  checkoutLoading = false,

  heldSales = [],

  onRestoreHeld,

  onDeleteHeld,

}) {

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



  const formatted = Number(total || 0).toLocaleString("en-BD", {

    minimumFractionDigits: 2,

    maximumFractionDigits: 2,

  });



  return (

    <div className="shrink-0 overflow-x-hidden bg-[#1e3a5f] text-white">

      <div className="flex min-w-0 items-center gap-1 px-2 py-1.5 md:gap-2 md:px-3 md:py-2">

        <div className="hidden min-w-0 items-center gap-2 md:flex md:w-[26%] md:max-w-[320px]">

          <Link

            href="/admin/dashboard"

            title="Back to dashboard"

            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#22c55e] text-white shadow-md"

          >

            <ChevronLeft className="size-5" strokeWidth={3} />

            <ChevronLeft className="-ml-3 size-5" strokeWidth={3} />

          </Link>

          <span className="flex min-w-0 items-center gap-1 truncate text-[11px] font-semibold text-white/90">

            Powered By

            <span className="relative inline-block h-5 w-5 shrink-0">

              <Image src={sbtMark} alt="" fill sizes="20px" className="object-contain" />

            </span>

            <span className="truncate font-bold text-white">SB Telecom</span>

          </span>

        </div>



        <p className="shrink-0 text-sm font-extrabold tracking-tight md:hidden">

          Total : {formatted} TK

        </p>



        <p className="hidden flex-1 text-center text-lg font-extrabold tracking-tight md:block lg:text-xl">

          Total : {formatted}{" "}

          <span className="text-base font-bold">TK</span>

        </p>



        <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-0.5 md:ml-0 md:gap-1.5">

          <button

            type="button"

            onClick={toggleFullscreen}

            title="Fullscreen"

            className={`${iconBtn} hidden bg-[#38bdf8] md:flex`}

          >

            <Monitor className="size-4 md:size-[18px]" />

          </button>

          <button

            type="button"

            title="Calculator"

            className={`${iconBtn} bg-[#9333ea]`}

          >

            <Calculator className="size-4 md:size-[18px]" />

          </button>

          <button

            type="button"

            onClick={onExchange}

            title="Exchange (F6)"

            className={`${actionBtn} hidden bg-[#3b82f6] hover:bg-[#2563eb] md:flex md:min-w-[5.5rem]`}

          >

            <ArrowLeftRight className="size-4 shrink-0" />

            Exchange

          </button>

          <button

            type="button"

            onClick={onExchange}

            title="Exchange (F6)"

            className={`${iconBtn} bg-[#3b82f6] md:hidden`}

          >

            <ArrowLeftRight className="size-4" />

          </button>



          <DropdownMenu modal={false}>

            <DropdownMenuTrigger asChild>

              <button

                type="button"

                title="Held sales"

                className={`${iconBtn} relative hidden bg-[#c4a574] md:flex`}

              >

                <List className="size-4 md:size-[18px]" />

                {heldSales.length > 0 && (

                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-300 px-0.5 text-[8px] font-bold text-gray-900">

                    {heldSales.length}

                  </span>

                )}

              </button>

            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="max-h-64 w-56 overflow-y-auto">

              <DropdownMenuLabel>Held sales</DropdownMenuLabel>

              <DropdownMenuSeparator />

              {heldSales.length === 0 ? (

                <p className="px-3 py-3 text-center text-xs text-muted-foreground">

                  No holds. Use Hold or F3.

                </p>

              ) : (

                heldSales.map((h) => (

                  <div key={h.id} className="flex items-stretch gap-1 px-1 py-1">

                    <button

                      type="button"

                      onClick={() => onRestoreHeld?.(h.id)}

                      className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left hover:bg-accent"

                    >

                      <p className="truncate text-xs font-semibold">{holdDisplayTitle(h)}</p>

                      <p className="text-xs font-bold text-primary">

                        TK {Number(h.total || 0).toLocaleString()}

                      </p>

                    </button>

                    <button

                      type="button"

                      onClick={() => onDeleteHeld?.(h.id)}

                      className="flex size-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50"

                    >

                      <Trash2 className="size-4" />

                    </button>

                  </div>

                ))

              )}

            </DropdownMenuContent>

          </DropdownMenu>



          <button

            type="button"

            onClick={onHold}

            disabled={cartEmpty}

            title="Hold (F3)"

            className={`${actionBtn} min-w-[4.5rem] flex-1 bg-[#f59e0b] hover:bg-[#fbbf24] md:min-w-[5.5rem] md:flex-none`}

          >

            <List className="size-4 shrink-0 max-md:hidden" />
            Hold

          </button>



          <button

            type="button"

            onClick={onClear}

            disabled={cartEmpty}

            title="Clear cart"

            className={`${actionBtn} bg-[#ef4444] px-2.5 hover:bg-[#f87171] md:px-3`}

          >

            <Trash2 className="size-4 shrink-0 md:hidden" />

            <span className="hidden md:inline">Clear</span>

          </button>



          <button

            type="button"

            onClick={onPayment}

            disabled={cartEmpty || checkoutLoading}

            title="Payment (F2)"

            className={`${actionBtn} min-w-[4.25rem] flex-1 bg-[#16a34a] hover:bg-[#22c55e] md:min-w-[6.5rem] md:flex-none`}

          >

            <Banknote className="size-4 shrink-0 max-md:hidden" />

            {checkoutLoading ? "…" : "Payment"}

            {!checkoutLoading && <ChevronRight className="size-4 shrink-0 max-md:hidden" />}

          </button>

        </div>

      </div>



      <div className="flex items-center justify-between border-t border-white/15 px-2 py-1 md:hidden">

        <Link

          href="/admin/dashboard"

          className="flex size-8 items-center justify-center rounded-md bg-[#22c55e] text-white"

        >

          <ChevronLeft className="size-4" strokeWidth={3} />

        </Link>

        <span className="flex items-center gap-1 text-[10px] font-semibold text-white/90">

          Powered By

          <span className="relative inline-block h-4 w-4 shrink-0">

            <Image src={sbtMark} alt="" fill sizes="16px" className="object-contain" />

          </span>

          <span className="text-white">SB Telecom</span>

        </span>

      </div>

    </div>

  );

}

