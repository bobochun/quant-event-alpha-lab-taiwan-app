"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildAlphaEngineResults } from "../lib/alphaEngine";
import { mockEvents, mockStocks, mockThemes } from "../lib/mockData";
import { CatalystTable, SectionCard } from "../components/ui";
import type { Event, EventType } from "../lib/types";
import { addDays } from "../lib/utils";
import { loadEvents, loadJournal, saveEvents, saveJournal } from "../lib/storage";

export default function EventRadarPage() {
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [draft, setDraft] = useState({
    symbol: "2330",
    name: "TSMC",
    eventType: "investorConference" as EventType,
    eventTitle: "Manual event research item",
    eventDate: addDays(3),
    confidence: 60,
    expectedImpact: 65,
    marketAwareness: 40,
    relatedThemes: "AI server"
  });
  const [windowDays, setWindowDays] = useState(7);
  const [eventType, setEventType] = useState<EventType | "all">("all");
  const [theme, setTheme] = useState("all");
  const [hideOverheated, setHideOverheated] = useState(false);
  const [hideLowConfidence, setHideLowConfidence] = useState(false);
  const [sortBy, setSortBy] = useState<"alpha" | "catalyst" | "days">("alpha");

  useEffect(() => setEvents(loadEvents()), []);

  const eventTypes = Array.from(new Set([...mockEvents, ...events].map((event) => event.eventType)));
  const themes = Array.from(new Set(events.flatMap((event) => event.relatedThemes)));
  const rows = useMemo(
    () =>
      buildAlphaEngineResults(events, mockStocks, mockThemes)
        .filter((row) => row.daysToEvent >= 0 && row.daysToEvent <= windowDays)
        .filter((row) => !row.event.ignoredUntil || row.event.ignoredUntil < new Date().toISOString().slice(0, 10))
        .filter((row) => eventType === "all" || row.event.eventType === eventType)
        .filter((row) => theme === "all" || row.event.relatedThemes.includes(theme))
        .filter((row) => !hideOverheated || (!row.event.flaggedOverheated && row.overheatRisk !== "high" && row.overheatRisk !== "critical"))
        .filter((row) => !hideLowConfidence || row.event.confidence >= 50)
        .sort((a, b) => (sortBy === "alpha" ? b.alpha.combinedAlphaScore - a.alpha.combinedAlphaScore : sortBy === "catalyst" ? b.catalyst.totalCatalystScore - a.catalyst.totalCatalystScore : a.daysToEvent - b.daysToEvent)),
    [eventType, events, hideLowConfidence, hideOverheated, sortBy, theme, windowDays]
  );

  function patchEvent(id: string, patch: Partial<Event>) {
    const next = events.map((event) => (event.id === id ? { ...event, ...patch, updatedAt: new Date().toISOString() } : event));
    setEvents(next);
    saveEvents(next);
  }

  function addEvent() {
    const now = new Date().toISOString();
    const next: Event[] = [
      {
        id: `manual-event-${Date.now()}`,
        symbol: draft.symbol,
        name: draft.name,
        eventType: draft.eventType,
        eventTitle: draft.eventTitle,
        eventDate: draft.eventDate,
        eventTime: "14:30",
        source: "Manual",
        sourceUrl: "",
        dataSource: "Manual",
        sourceNote: "Manual local event. Verify source before research use.",
        confidence: draft.confidence,
        expectedImpact: draft.expectedImpact,
        marketAwareness: draft.marketAwareness,
        relatedThemes: draft.relatedThemes.split(",").map((item) => item.trim()).filter(Boolean),
        createdAt: now,
        updatedAt: now
      },
      ...events
    ];
    setEvents(next);
    saveEvents(next);
  }

  function addJournalNote(id: string) {
    const event = events.find((item) => item.id === id);
    if (!event) return;
    const journal = loadJournal();
    saveJournal([
      {
        id: `journal-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        symbol: event.symbol,
        name: event.name,
        action: "review",
        strategy: "Manual Event Research",
        relatedEventId: event.id,
        eventType: event.eventType,
        price: 0,
        shares: 0,
        reason: `Event radar note: ${event.eventTitle}`,
        eventThesis: "Add thesis, invalidation rule, and risk reward before taking action.",
        wasEventPricedIn: false,
        didChaseNews: false,
        planFollowed: true,
        emotion: "disciplined",
        dataSource: "Manual",
        sourceNote: "Manual note created from Event Radar."
      },
      ...journal
    ]);
    patchEvent(id, { reviewed: true });
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Event Radar Controls">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <select className="rounded border border-border bg-[#0b1118] p-2" value={windowDays} onChange={(event) => setWindowDays(Number(event.target.value))}>
            {[7, 14, 30].map((day) => <option key={day} value={day}>{day} days</option>)}
          </select>
          <select className="rounded border border-border bg-[#0b1118] p-2" value={eventType} onChange={(event) => setEventType(event.target.value as EventType | "all")}>
            <option value="all">All event types</option>
            {eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <select className="rounded border border-border bg-[#0b1118] p-2" value={theme} onChange={(event) => setTheme(event.target.value)}>
            <option value="all">All themes</option>
            {themes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="rounded border border-border bg-[#0b1118] p-2" value={sortBy} onChange={(event) => setSortBy(event.target.value as "alpha" | "catalyst" | "days")}>
            <option value="alpha">combinedAlphaScore</option>
            <option value="catalyst">catalystScore</option>
            <option value="days">daysToEvent</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={hideOverheated} onChange={(event) => setHideOverheated(event.target.checked)} /> Hide overheated</label>
          <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={hideLowConfidence} onChange={(event) => setHideLowConfidence(event.target.checked)} /> Hide low confidence</label>
        </div>
      </SectionCard>
      <SectionCard title="Add Manual Event">
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          <input className="rounded border border-border bg-[#0b1118] p-2" value={draft.symbol} onChange={(event) => setDraft({ ...draft, symbol: event.target.value })} />
          <input className="rounded border border-border bg-[#0b1118] p-2" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <select className="rounded border border-border bg-[#0b1118] p-2" value={draft.eventType} onChange={(event) => setDraft({ ...draft, eventType: event.target.value as EventType })}>
            {eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <input className="rounded border border-border bg-[#0b1118] p-2" type="date" value={draft.eventDate} onChange={(event) => setDraft({ ...draft, eventDate: event.target.value })} />
          <input className="rounded border border-border bg-[#0b1118] p-2 xl:col-span-2" value={draft.eventTitle} onChange={(event) => setDraft({ ...draft, eventTitle: event.target.value })} />
          <input className="rounded border border-border bg-[#0b1118] p-2" value={draft.relatedThemes} onChange={(event) => setDraft({ ...draft, relatedThemes: event.target.value })} />
          <button className="rounded bg-accent px-3 py-2 font-semibold text-black" onClick={addEvent}>Add Event</button>
        </div>
        <p className="mt-2 text-xs text-muted">Manual events are local only and should include verified source notes before real research use.</p>
      </SectionCard>
      <SectionCard title="Future Catalyst Events">
        <CatalystTable
          rows={rows}
          actions={(row) => (
            <div className="flex min-w-80 flex-wrap gap-2 text-xs">
              <Link className="rounded border border-accent/50 px-2 py-1 text-accent" href={`/trade-plan?eventId=${row.event.id}&symbol=${row.event.symbol}`}>Create Trade Plan</Link>
              <button className="rounded border border-border px-2 py-1 text-muted" onClick={() => addJournalNote(row.event.id)}>Add Journal Note</button>
              <button className="rounded border border-border px-2 py-1 text-muted" onClick={() => patchEvent(row.event.id, { reviewed: true })}>Mark Reviewed</button>
              <button className="rounded border border-border px-2 py-1 text-muted" onClick={() => patchEvent(row.event.id, { ignoredUntil: addDays(7) })}>Ignore 7 Days</button>
              <button className="rounded border border-amber/50 px-2 py-1 text-amber" onClick={() => patchEvent(row.event.id, { flaggedOverheated: true })}>Flag Overheated</button>
            </div>
          )}
        />
      </SectionCard>
    </div>
  );
}
