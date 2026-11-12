"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

/**
 * Boton de envio que pide confirmacion antes de enviar el formulario.
 * Se usa para acciones destructivas (borrar partida, mazo, nota...).
 */
export function ConfirmButton({
  message = "¿Seguro que quieres continuar? Esta acción no se puede deshacer.",
  onClick,
  ...props
}: ComponentProps<typeof Button> & { message?: string }) {
  return (
    <Button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...props}
    />
  );
}
