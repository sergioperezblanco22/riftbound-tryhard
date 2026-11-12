import { LogOutIcon, MailIcon, UserIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signOutAction } from "@/lib/db/actions";
import { getCurrentProfile } from "@/lib/db/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Ajustes" };

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  const label = profile?.display_name || profile?.username || "Jugador";
  const configured = isSupabaseConfigured();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ajustes"
        description="Tu perfil y las preferencias de la aplicación."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>
              {configured
                ? "Datos de tu cuenta de Supabase."
                : "Perfil de ejemplo en modo demo."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarFallback>{initials(label)}</AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <p className="font-medium">{label}</p>
                {profile?.username ? (
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <UserIcon className="size-3.5" />@{profile.username}
                  </p>
                ) : null}
              </div>
            </div>

            <dl className="grid gap-3 text-sm">
              <div className="flex items-center justify-between border-t pt-3">
                <dt className="text-muted-foreground">Miembro desde</dt>
                <dd>{formatDate(profile?.created_at)}</dd>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <dt className="flex items-center gap-1 text-muted-foreground">
                  <MailIcon className="size-3.5" />
                  Autenticación
                </dt>
                <dd>{configured ? "Supabase Auth" : "Modo demo"}</dd>
              </div>
            </dl>

            {configured ? (
              <form action={signOutAction}>
                <Button type="submit" variant="outline">
                  <LogOutIcon />
                  Cerrar sesión
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Apariencia</CardTitle>
            <CardDescription>
              La aplicación usa el tema oscuro por defecto para sesiones largas
              de análisis.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-sm">Cambiar tema claro / oscuro</span>
            <ThemeToggle />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
