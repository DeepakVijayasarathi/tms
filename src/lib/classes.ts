import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export type SessionStatus = "Scheduled" | "Live" | "Ended" | "Cancelled";

export interface ClassItem {
  id: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  status: SessionStatus;
  location?: string;
  capacity: number;
  course: { id: string; title: string; slug: string };
  instructor?: string;
  isHost: boolean;
  registered: number;
  present: number;
  myStatus?: "Registered" | "Present" | "Absent";
}

export interface ClassDetail extends ClassItem {
  startedAt?: string;
  endedAt?: string;
  canJoin: boolean;
  joinBlockedReason?: string;
  joinOpensAt: string;
}

export interface JoinInfo {
  sessionId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: SessionStatus;
  course: { id: string; title: string; slug: string };
  domain: string;
  room: string;
  token?: string | null;
  displayName: string;
  email: string;
  isHost: boolean;
}

/** Learners may enter this many minutes early; mirrors Jitsi:JoinEarlyMinutes on the API. */
export const JOIN_EARLY_MINUTES = 15;
const HOST_EARLY_MINUTES = 60;

export const toDate = (iso: string) => new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");

export function useMyClasses(scope: "upcoming" | "past" = "upcoming", enabled = true) {
  return useQuery({
    queryKey: ["my-classes", scope],
    queryFn: () => api<ClassItem[]>(`/me/sessions?scope=${scope}`),
    enabled,
    refetchInterval: scope === "upcoming" ? 60_000 : false,
  });
}

/** Re-renders every `ms` so countdowns and "opens in" labels stay current. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Whether the classroom accepts this user right now (client-side mirror of the API's rule). */
export function canEnter(c: Pick<ClassItem, "status" | "startsAt" | "endsAt" | "isHost">, now = Date.now()) {
  if (c.status === "Live") return true;
  if (c.status !== "Scheduled") return false;
  const opens = toDate(c.startsAt).getTime() - (c.isHost ? HOST_EARLY_MINUTES : JOIN_EARLY_MINUTES) * 60_000;
  return now >= opens && (c.isHost || now <= toDate(c.endsAt).getTime());
}

/** Status to show: a class whose time passed without ever going live reads as "Expired" (not held). */
export function displayStatus(c: Pick<ClassItem, "status" | "endsAt">, now = Date.now()) {
  return c.status === "Scheduled" && toDate(c.endsAt).getTime() < now ? "Expired" : c.status;
}

export function timeRange(startIso: string, endIso: string) {
  const fmt = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${fmt(toDate(startIso))} – ${fmt(toDate(endIso))}`;
}

export function dayLabel(iso: string, now = new Date()) {
  const d = toDate(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(d) - startOf(now)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
}

export function groupByDay<T extends { startsAt: string }>(items: T[]) {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label = dayLabel(item.startsAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

/** "in 2 h 5 min", "in 3 days", "now". */
export function relative(iso: string, now = Date.now()) {
  const mins = Math.round((toDate(iso).getTime() - now) / 60_000);
  if (Math.abs(mins) < 1) return "now";
  const abs = Math.abs(mins);
  const text = abs < 60 ? `${abs} min` : abs < 48 * 60 ? `${Math.floor(abs / 60)} h${abs % 60 ? ` ${abs % 60} min` : ""}` : `${Math.round(abs / 1440)} days`;
  return mins > 0 ? `in ${text}` : `${text} ago`;
}

export function durationMinutes(startIso: string, endIso: string) {
  return Math.round((toDate(endIso).getTime() - toDate(startIso).getTime()) / 60_000);
}
