import Link from "next/link";
import type { ReactNode } from "react";
import { SparklesIcon } from "lucide-react";

import { SchemaBanner } from "@/components/schema-banner";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <SparklesIcon className="size-4" />
          </div>
          Riftbound Competitive Tracker
        </Link>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-full max-w-sm flex-col gap-4">
            <SchemaBanner />
            {children}
          </div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-muted lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-emerald-500/10" />
        <div className="relative flex h-full flex-col justify-end gap-3 p-10">
          <h2 className="text-2xl font-semibold">
            Registra tus partidas y descubre dónde ganas.
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Estadísticas de winrate por mazo, versión y matchup, con un AI Coach
            que analiza tus datos reales para proponerte mejoras concretas.
          </p>
        </div>
      </div>
    </div>
  );
}
