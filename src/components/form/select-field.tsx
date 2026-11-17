"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

const EMPTY = "__empty__";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Campo de seleccion controlado que participa en un <form> mediante un input
 * oculto (prop `name` de Base UI Select).
 *
 * Cuando `searchable` es true, se muestra un input de texto dentro del desplegable
 * para filtrar las opciones al escribir. El input de busqueda usa un ref para
 * mantener el foco en iOS Safari cuando el desplegable se re-renderiza al filtrar.
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
  searchable = false,
}: {
  id: string;
  name?: string;
  label?: string;
  placeholder: string;
  value: string | null;
  onValueChange: (value: string | null) => void;
  options: SelectOption[];
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
  searchable?: boolean;
}) {
  const items = useMemo(
    () =>
      emptyLabel
        ? [{ value: EMPTY, label: emptyLabel }, ...options]
        : options,
    [options, emptyLabel]
  );
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = useMemo(() => {
    if (!searchable || !search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, search, searchable]);

  // Mantener el foco en el input de busqueda cuando el desplegable se
  // re-renderiza por el filtrado (problema comun en iOS Safari).
  const restoreFocus = useCallback(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} className="mb-1.5 text-sm">
          {label}
        </Label>
      )}
      <Select
        name={name}
        items={filteredItems}
        value={value ?? (emptyLabel ? EMPTY : null)}
        onValueChange={(next) => {
          setSearch("");
          onValueChange(
            next === EMPTY || next === null ? null : (next as string)
          );
        }}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {searchable && (
            <div className="relative px-2 py-1.5 border-b bg-muted/50">
              <Input
                ref={searchInputRef}
                id={`${id}-search`}
                placeholder="Buscar…"
                defaultValue={search}
                className="h-8 text-sm pl-8 pr-2 bg-background"
                onChange={(e) => {
                  setSearch(e.target.value);
                  // Restaurar el foco tras el re-render para que el teclado
                  // no se cierre en iOS Safari.
                  requestAnimationFrame(restoreFocus);
                }}
              />
              <SearchIcon
                className="absolute left-2.5 top-[50%] -translate-y-[50%] size-4 text-muted-foreground"
              />
            </div>
          )}
          {filteredItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
          {searchable && search.trim() && filteredItems.length === 0 && (
            <div className="px-2 py-2 text-xs text-muted-foreground text-center">
              No se encontraron resultados
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
