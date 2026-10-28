import {
  Award, BookOpen, Brain, ClipboardCheck, Crosshair, Flag, Flame, Library, Lock, MessageSquare, Rocket, Star, Target, Users, Video, Zap, type LucideIcon,
} from "lucide-react";
import type { BadgeState, Tier } from "@/lib/gamification";
import { cx } from "./ui";

const ICONS: Record<string, LucideIcon> = { Award, BookOpen, Brain, ClipboardCheck, Crosshair, Flag, Flame, Library, MessageSquare, Rocket, Star, Target, Users, Video, Zap };

const TIERS: Record<Tier, { ring: string; face: string; label: string; text: string }> = {
  bronze: { ring: "from-amber-600 via-orange-300 to-amber-700", face: "from-amber-500 to-orange-700", label: "Bronze", text: "text-amber-700" },
  silver: { ring: "from-slate-400 via-slate-100 to-slate-500", face: "from-slate-400 to-slate-600", label: "Silver", text: "text-slate-600" },
  gold: { ring: "from-yellow-500 via-yellow-100 to-amber-500", face: "from-yellow-400 to-amber-600", label: "Gold", text: "text-amber-600" },
  platinum: { ring: "from-indigo-400 via-sky-100 to-violet-500", face: "from-indigo-500 to-violet-700", label: "Platinum", text: "text-violet-600" },
};

/** Circular medal: metallic ring by tier, icon in the middle. Locked badges are greyed out. */
export function Medal({ badge, size = "md" }: { badge: Pick<BadgeState, "icon" | "tier" | "earned" | "name">; size?: "sm" | "md" | "lg" }) {
  const Icon = ICONS[badge.icon] ?? Award;
  const t = TIERS[badge.tier];
  const dims = { sm: "h-10 w-10", md: "h-16 w-16", lg: "h-24 w-24" }[size];
  const icon = { sm: "h-4 w-4", md: "h-7 w-7", lg: "h-10 w-10" }[size];
  return (
    <span className={cx("relative inline-flex shrink-0 items-center justify-center rounded-full p-[3px]", dims, badge.earned ? `bg-gradient-to-br ${t.ring} shadow-md` : "bg-slate-200")} aria-label={`${badge.name}${badge.earned ? "" : " (locked)"}`}>
      <span className={cx("flex h-full w-full items-center justify-center rounded-full", badge.earned ? `bg-gradient-to-br ${t.face} text-white` : "bg-slate-100 text-slate-400")}>
        <Icon className={icon} aria-hidden />
      </span>
      {!badge.earned && size !== "sm" && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-400 shadow ring-1 ring-slate-200"><Lock className="h-3 w-3" aria-hidden /></span>
      )}
    </span>
  );
}

export function BadgeCard({ badge }: { badge: BadgeState }) {
  const t = TIERS[badge.tier];
  const pct = Math.round((badge.current / badge.target) * 100);
  return (
    <div className={cx("flex flex-col items-center rounded-2xl border p-5 text-center transition-shadow", badge.earned ? "border-slate-200 bg-white shadow-card hover:shadow-md" : "border-dashed border-slate-200 bg-slate-50/60")}>
      <Medal badge={badge} />
      <div className={cx("mt-3 text-[11px] font-bold uppercase tracking-wider", badge.earned ? t.text : "text-slate-400")}>{t.label}</div>
      <div className={cx("mt-0.5 font-semibold", badge.earned ? "text-ink" : "text-ink-soft")}>{badge.name}</div>
      <p className="mt-1 text-xs text-ink-mute">{badge.description}</p>
      {badge.earned ? (
        <div className="mt-3 text-[11px] font-medium text-emerald-600">Earned {badge.awardedAt ? new Date(badge.awardedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : ""}</div>
      ) : (
        <div className="mt-3 w-full">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-slate-400" style={{ width: `${pct}%` }} /></div>
          <div className="mt-1 text-[11px] text-ink-mute">{badge.current} / {badge.target}</div>
        </div>
      )}
    </div>
  );
}
