import type { ReactNode } from "react";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { DemoBanner } from "@/components/demo-banner";
import { SchemaBanner } from "@/components/schema-banner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentProfile } from "@/lib/db/queries";

// Todo el panel depende de la sesion del usuario y de datos en vivo.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader
          displayName={profile?.display_name ?? null}
          username={profile?.username ?? null}
        />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <DemoBanner />
          <SchemaBanner />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
