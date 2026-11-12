"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { EventForm } from "@/components/events/event-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { SetRow } from "@/lib/db/types";

export function CreateEventDialog({ sets }: { sets: SetRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        Nuevo torneo
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo torneo</DialogTitle>
          <DialogDescription>
            Agrupa partidas por evento para analizar cada torneo por separado.
          </DialogDescription>
        </DialogHeader>
        <EventForm sets={sets} />
      </DialogContent>
    </Dialog>
  );
}
