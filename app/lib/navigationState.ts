"use client";

import { loadJson, saveJson } from "./storage";
import type { Event } from "./types";

const key = "qealt.selectedEvent";

export interface SelectedEventState {
  event: Event;
  catalystScore?: number;
  combinedAlphaScore?: number;
  nextAction?: string;
  selectedAt: string;
}

export function saveSelectedEvent(state: Omit<SelectedEventState, "selectedAt">): void {
  saveJson(key, { ...state, selectedAt: new Date().toISOString() });
}

export function loadSelectedEvent(): SelectedEventState | null {
  return loadJson<SelectedEventState | null>(key, null);
}
