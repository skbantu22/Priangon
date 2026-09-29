"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import {
  WAREHOUSE_TILL,
  getPosCurrentUser,
  posShowroomsQueryOptions,
  resolvePosTill,
  usePosShowroomId,
  writePosShowroom,
} from "@/lib/posProducts";
import BranchSwitchScreen from "./BranchSwitchScreen";

export default function StoreSwitch({ variant = "bar" }) {
  const picked = usePosShowroomId();
  const { data: showrooms = [] } = useQuery(posShowroomsQueryOptions());
  const auth = useSelector((state) => state.authStore.auth);
  const currentUser = getPosCurrentUser(auth);
  const isAdmin = currentUser?.role === "admin";
  const branches = showrooms.filter((s) => s?._id && s.isActive !== false);
  const tillId = resolvePosTill({ picked, showrooms, currentUser });
  const selected = branches.find((s) => String(s._id) === String(tillId));
  const value = selected ? String(selected._id) : "";
  const [trip, setTrip] = useState(null);
  const closeTrip = useCallback(() => setTrip(null), []);

  if (!isAdmin) {
    const id = currentUser ? resolvePosTill({ showrooms, currentUser }) : "";
    const name =
      !currentUser
        ? "Branch"
        : !id || id === WAREHOUSE_TILL
          ? "Warehouse"
          : showrooms.find((s) => String(s._id) === String(id))?.name || "Branch";
    return (
      <span className="max-w-[180px] truncate text-sm font-bold" title={name}>
        {name}
      </span>
    );
  }

  const choose = (next) => {
    if (next === value) return;
    const to = branches.find((s) => String(s._id) === next);
    setTrip({
      from: selected?.name || "Branch",
      to: to?.name || "Branch",
    });
    writePosShowroom(next);
  };

  const selectClass =
    variant === "field"
      ? "h-10 min-w-[180px] rounded-lg border border-[#e3e3e3] bg-white px-3 text-sm font-bold text-[#1a1a1a] outline-none"
      : "h-9 w-[132px] rounded-lg bg-white px-2 text-sm font-bold text-gray-900 outline-none sm:w-[200px]";

  return (
    <>
      {trip && <BranchSwitchScreen from={trip.from} to={trip.to} onDone={closeTrip} />}
      <select
        value={value}
        onChange={(event) => choose(event.target.value)}
        title="Branch"
        aria-label="Branch"
        className={selectClass}
      >
        {branches.map((branch) => (
          <option key={branch._id} value={String(branch._id)}>
            {branch.name}
          </option>
        ))}
      </select>
    </>
  );
}
