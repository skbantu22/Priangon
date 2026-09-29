"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function HoldNoteDialog({ open, onOpenChange, onSave }) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hold this sale</DialogTitle>
          <DialogDescription>
            No customer on this cart. Add a short name or note so you can find it
            in the hold list.
          </DialogDescription>
        </DialogHeader>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={80}
          placeholder="e.g. Red shirt guy / Table 2"
          className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && note.trim()) {
              onSave(note.trim());
              onOpenChange(false);
            }
          }}
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={!note.trim()}
            onClick={() => {
              onSave(note.trim());
              onOpenChange(false);
            }}
          >
            Save hold
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
