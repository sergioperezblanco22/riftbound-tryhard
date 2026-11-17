"use client";

import { useMemo, useState } from "react";

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
 * para filtrar las opciones al escribir.
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
  /** Opcional: si se omite, el Select no renderiza input oculto propio. Se recomienda
   * usar un input hidden externo cuando el campo pertenece a un formulario con
   * inputs ocultos gestionados manualmente (p. ej. un wizard con pasos condicionales). */
  name?: string;
  /** Opcional: si se omite, no se renderiza etiqueta interna. */
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

  const filteredItems = useMemo(() => {
    if (!searchable || !search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, search, searchable]);

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
                id={`${id}-search`}
                placeholder="Buscar…"
                className="h-8 text-sm pl-8 pr-2 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
