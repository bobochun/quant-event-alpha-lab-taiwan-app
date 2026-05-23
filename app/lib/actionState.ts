"use client";

import { canUseStorage, loadJson, saveJson } from "./storage";

const key = "qealt.actionState";

export interface ActionState {
  reviewedEventIds: string[];
  ignoredUntil: Record<string, string>;
  flaggedOverheated: string[];
  createdTradePlanEventIds: string[];
  journalLinkedEventIds: string[];
}

export const defaultActionState: ActionState = {
  reviewedEventIds: [],
  ignoredUntil: {},
  flaggedOverheated: [],
  createdTradePlanEventIds: [],
  journalLinkedEventIds: []
};

export function loadActionState(): ActionState {
  return loadJson<ActionState>(key, defaultActionState);
}

export function saveActionState(state: ActionState): void {
  saveJson(key, state);
}

export function resetActionState(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(key);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function updateActionState(patch: Partial<ActionState>): ActionState {
  const current = loadActionState();
  const next: ActionState = {
    reviewedEventIds: unique(patch.reviewedEventIds ?? current.reviewedEventIds),
    ignoredUntil: patch.ignoredUntil ?? current.ignoredUntil,
    flaggedOverheated: unique(patch.flaggedOverheated ?? current.flaggedOverheated),
    createdTradePlanEventIds: unique(patch.createdTradePlanEventIds ?? current.createdTradePlanEventIds),
    journalLinkedEventIds: unique(patch.journalLinkedEventIds ?? current.journalLinkedEventIds)
  };
  saveActionState(next);
  return next;
}

export function markEventReviewed(eventId: string): ActionState {
  const current = loadActionState();
  return updateActionState({ reviewedEventIds: [...current.reviewedEventIds, eventId] });
}

export function ignoreEventUntil(eventId: string, isoDate: string): ActionState {
  const current = loadActionState();
  return updateActionState({ ignoredUntil: { ...current.ignoredUntil, [eventId]: isoDate } });
}

export function flagEventOverheated(eventId: string): ActionState {
  const current = loadActionState();
  return updateActionState({ flaggedOverheated: [...current.flaggedOverheated, eventId] });
}

export function markTradePlanCreated(eventId?: string): ActionState {
  if (!eventId) return loadActionState();
  const current = loadActionState();
  return updateActionState({ createdTradePlanEventIds: [...current.createdTradePlanEventIds, eventId] });
}

export function markJournalLinked(eventId?: string): ActionState {
  if (!eventId) return loadActionState();
  const current = loadActionState();
  return updateActionState({ journalLinkedEventIds: [...current.journalLinkedEventIds, eventId] });
}
