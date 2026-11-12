"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { DeckForm } from "@/components/decks/deck-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { LegendRow } from "@/lib/db/types";

export function CreateDeckDialog({ legends }: { legends: LegendRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        Nuevo mazo
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo mazo</DialogTitle>
          <DialogDescription>
            Se creará automáticamente la versión V1 con estos datos.
          </DialogDescription>
        </DialogHeader>
        <DeckForm legends={legends} />
      </DialogContent>
    </Dialog>
  );
}
