import Link from "next/link";
import { CalendarDaysIcon, MapPinIcon } from "lucide-react";

import { CreateEventDialog } from "@/components/events/create-event-dialog";
import { PageHeader } from "@/components/page-header";
import { SampleSize } from "@/components/sample-size";
import { WinrateBadge } from "@/components/winrate-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getEventList, getSets } from "@/lib/db/queries";
import { formatDate, formatRecord } from "@/lib/format";

export const metadata = { title: "Torneos" };

export default async function EventsPage() {
  const [events, sets] = await Promise.all([getEventList(), getSets()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Torneos"
        description="Agrupa tus partidas por evento y analiza cada torneo."
        actions={<CreateEventDialog sets={sets} />}
      />

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-12 text-center">
          <CalendarDaysIcon className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No hay torneos registrados todavía.
          </p>
          <CreateEventDialog sets={sets} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-2">
                  <Link
                    href={`/events/${event.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {event.name}
                  </Link>
                  <WinrateBadge value={event.summary.winrate} />
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1">
                    <CalendarDaysIcon className="size-3.5" />
                    {formatDate(event.start_date)}
                  </span>
                  {event.location ? (
                    <span className="flex items-center gap-1">
                      <MapPinIcon className="size-3.5" />
                      {event.location}
                    </span>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {event.event_type ? (
                    <Badge variant="secondary" className="capitalize">
                      {event.event_type}
                    </Badge>
                  ) : null}
                  <Badge variant="outline">{event.format_code}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm tabular-nums">
                    {formatRecord(
                      event.summary.wins,
                      event.summary.losses,
                      event.summary.draws
                    )}
                  </span>
                  <SampleSize count={event.summary.matches} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
