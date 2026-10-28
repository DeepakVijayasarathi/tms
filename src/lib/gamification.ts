import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export type Tier = "bronze" | "silver" | "gold" | "platinum";
export interface Level { number: number; title: string; minXp: number; nextXp?: number | null }
export interface BadgeState { key: string; name: string; description: string; icon: string; tier: Tier; target: number; current: number; earned: boolean; awardedAt?: string | null }
export interface Progress {
  xp: number;
  weekXp: number;
  level: Level;
  streak: { current: number; best: number };
  stats: Record<string, number>;
  badges: BadgeState[];
  activity: { date: string; points: number; count: number }[];
  recent: { source: string; label: string; points: number; occurredAt: string }[];
}

export function useProgress(enabled = true) {
  return useQuery({ queryKey: ["progress"], queryFn: () => api<Progress>("/me/progress"), enabled, staleTime: 30_000 });
}

/** 0–100 progress through the current level. */
export function levelPercent(xp: number, level: Level) {
  if (!level.nextXp) return 100;
  return Math.min(100, Math.max(0, ((xp - level.minXp) / (level.nextXp - level.minXp)) * 100));
}
