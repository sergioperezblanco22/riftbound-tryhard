"use client";

import { useMemo } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY = "__empty__";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Campo de seleccion controlado que participa en un <form> mediante un input
 * oculto (prop `name` de Base UI Select).
 */
export function SelectField({
  id,
  name,
  label,
  placeholder,
  value,
  onValueChange,
  options,
  emptyLabel,
  className,
  disabled,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  value: string | null;
  onValueChange: (value: string | null) => void;
  options: SelectOption[];
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const items = useMemo(
    () =>
      emptyLabel
        ? [{ value: EMPTY, label: emptyLabel }, ...options]
        : options,
    [options, emptyLabel]
  );

  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 text-sm">
        {label}
      </Label>
      <Select
        name={name}
        items={items}
        value={value ?? (emptyLabel ? EMPTY : null)}
        onValueChange={(next) =>
          onValueChange(
            next === EMPTY || next === null ? null : (next as string)
          )
        }
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
