"use client";

import Link from "next/link";
import { ChevronDownIcon, LogOutIcon, UserIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutAction } from "@/lib/db/actions";
import { isSupabaseConfigured } from "@/lib/env";

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function AppHeader({
  displayName,
  username,
}: {
  displayName: string | null;
  username: string | null;
}) {
  const label = displayName || username || "Jugador";
  const showAuth = isSupabaseConfigured();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <span className="text-sm font-medium text-muted-foreground">
        Riftbound Competitive Tracker
      </span>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        {showAuth ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="sm" className="gap-2 pr-1.5">
                  <Avatar className="size-6">
                    <AvatarFallback className="text-[0.65rem]">
                      {initials(label)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-32 truncate sm:inline">
                    {label}
                  </span>
                  <ChevronDownIcon className="size-3.5 text-muted-foreground" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex flex-col">
                  <span className="truncate font-medium">{label}</span>
                  {username ? (
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      @{username}
                    </span>
                  ) : null}
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem render={<Link href="/settings" />}>
                  <UserIcon />
                  Ajustes de perfil
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <form action={signOutAction}>
                <DropdownMenuItem
                  variant="destructive"
                  render={<button type="submit" className="w-full" />}
                >
                  <LogOutIcon />
                  Cerrar sesión
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/login" />}>
            Iniciar sesión
          </Button>
        )}
      </div>
    </header>
  );
}
