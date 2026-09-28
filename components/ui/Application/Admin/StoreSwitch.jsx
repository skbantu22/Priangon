"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, Store } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  posShowroomsQueryOptions,
  resolvePosShowroomId,
  usePosShowroomId,
  writePosShowroom,
} from "@/lib/posProducts";
import BranchSwitchScreen from "./BranchSwitchScreen";

export default function StoreSwitch({ variant = "pos" }) {
  const picked = usePosShowroomId();
  const { data: showrooms = [] } = useQuery(posShowroomsQueryOptions());
  const selectedId = resolvePosShowroomId({ picked, showrooms });
  const selected = showrooms.find((s) => String(s._id) === String(selectedId));
  const name = selected?.name || "Warehouse";
  const [trip, setTrip] = useState(null);
  const closeTrip = useCallback(() => setTrip(null), []);

  const triggerClass =
    variant === "sidebar"
      ? "mt-2 flex h-8 w-full items-center gap-1.5 rounded-lg bg-white/10 px-2 text-left text-[12px] font-bold text-white outline-none hover:bg-white/15"
      : "flex h-9 max-w-[200px] items-center gap-2 rounded-lg px-3 text-sm font-medium text-white/90 outline-none transition hover:bg-white/10 hover:text-white";

  return (
    <>
    {trip && <BranchSwitchScreen from={trip.from} to={trip.to} onDone={closeTrip} />}
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className={triggerClass}>
        <Store className={variant === "sidebar" ? "size-3.5 shrink-0" : "size-5 shrink-0"} />
        <span className="min-w-0 flex-1 truncate">{variant === "sidebar" ? "Switch store" : name}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-80" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {showrooms.length === 0 ? (
          <DropdownMenuItem asChild>
            <Link href="/admin/settings/branches">Add a branch</Link>
          </DropdownMenuItem>
        ) : (
          showrooms.map((s) => (
            <DropdownMenuItem
              key={s._id}
              onSelect={() => {
                if (String(s._id) === String(selectedId)) return;
                setTrip({ from: name, to: s.name });
                writePosShowroom(String(s._id));
              }}
              className={String(s._id) === String(selectedId) ? "font-bold" : ""}
            >
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              {s.isActive === false && (
                <span className="text-[10px] text-muted-foreground">Off</span>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}
