"use client";

import { useState } from "react";
import { GitBranchPlusIcon } from "lucide-react";

import { DeckVersionForm } from "@/components/decks/deck-version-form";
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

export function CreateVersionDialog({
  deckId,
  legends,
  nextVersion,
  defaultLegendId,
}: {
  deckId: string;
  legends: LegendRow[];
  nextVersion: number;
  defaultLegendId?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <GitBranchPlusIcon />
        Nueva versión
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nueva versión del mazo</DialogTitle>
          <DialogDescription>
            Cada versión es una instantánea histórica inmutable.
          </DialogDescription>
        </DialogHeader>
        <DeckVersionForm
          deckId={deckId}
          legends={legends}
          nextVersion={nextVersion}
          defaultLegendId={defaultLegendId}
        />
      </DialogContent>
    </Dialog>
  );
}
