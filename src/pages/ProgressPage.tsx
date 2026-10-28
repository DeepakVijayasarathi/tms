import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Award, BookOpen, Brain, CalendarCheck, ClipboardCheck, Crown, Flag, Flame, GraduationCap, Medal as MedalIcon, Rocket, Sparkles, Trophy, Video, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { levelPercent, useProgress, type Progress } from "@/lib/gamification";
import { BadgeCard, Medal } from "@/components/Badges";
import { Avatar, Card, CardHeader, Empty, ErrorNote, PageHeader, Segmented, Spinner, cx } from "@/components/ui";

const SOURCE_ICON: Record<string, typeof Zap> = {
  LessonCompleted: BookOpen, AssessmentPassed: ClipboardCheck, ClassAttended: Video, MilestoneAchieved: Flag,
  CourseCompleted: GraduationCap, CareerCompleted: Rocket, Practice: Brain,
};

export function ProgressPage() {
  const progress = useProgress();
  if (progress.isLoading) return <Spinner label="Loading your progress" />;
  if (!progress.data) return <ErrorNote error={progress.error} />;
  const p = progress.data;
  const earned = p.badges.filter((b) => b.earned);
  const sorted = [...p.badges].sort((a, b) => Number(b.earned) - Number(a.earned) || b.current / b.target - a.current / a.target);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Progress tracker" title="Progress & Badges" subtitle="Every lesson, class, assessment and practice round earns XP. Level up, keep your streak and collect badges." />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden">
          <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <LevelRing xp={p.xp} p={p} />
            <div>
              <div className="text-sm font-semibold uppercase tracking-wider text-brand-600">Level {p.level.number}</div>
              <div className="font-display text-3xl font-bold text-ink">{p.level.title}</div>
              <p className="mt-1 text-sm text-ink-mute">
                {p.level.nextXp ? <><span className="font-semibold text-ink">{p.level.nextXp - p.xp} XP</span> to level {p.level.number + 1}</> : "Top level reached — legendary!"}
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <Kpi icon={Zap} tone="text-brand-600 bg-brand-50" label="Total XP" value={p.xp.toLocaleString()} />
                <Kpi icon={Flame} tone="text-orange-600 bg-orange-50" label="Day streak" value={`${p.streak.current}`} hint={`Best ${p.streak.best}`} />
                <Kpi icon={Award} tone="text-violet-600 bg-violet-50" label="Badges" value={`${earned.length}/${p.badges.length}`} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 bg-slate-50/60 px-6 py-3 text-sm text-ink-soft">
            <span><span className="font-semibold text-ink">{p.weekXp} XP</span> this week</span>
            <span>{plural(p.stats.lessons ?? 0, "lesson")}</span>
            <span>{plural(p.stats.classes ?? 0, "live class", "live classes")}</span>
            <span>{plural(p.stats.milestones ?? 0, "milestone")}</span>
            <span>{plural(p.stats.practice ?? 0, "practice answer")} correct</span>
          </div>
        </Card>

        <Card>
          <CardHeader icon={Sparkles} title="Latest badges" subtitle={earned.length ? "Your most recent achievements" : "Earn your first badge by completing a lesson"} />
          <div className="flex flex-wrap gap-4 px-5 pb-5">
            {earned.length ? [...earned].sort((a, b) => (b.awardedAt ?? "").localeCompare(a.awardedAt ?? "")).slice(0, 6).map((b) => (
              <div key={b.key} className="flex w-20 flex-col items-center text-center">
                <Medal badge={b} />
                <span className="mt-2 text-xs font-semibold leading-tight text-ink">{b.name}</span>
              </div>
            )) : <Empty icon={MedalIcon} title="No badges yet" />}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader icon={CalendarCheck} title="Learning activity" subtitle="Last 12 weeks — darker days earned more XP" />
        <div className="px-5 pb-5"><Heatmap activity={p.activity} /></div>
      </Card>

      <Card>
        <CardHeader icon={Trophy} title="Badge collection" subtitle={`${earned.length} of ${p.badges.length} earned`} />
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {sorted.map((b) => <BadgeCard key={b.key} badge={b} />)}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader icon={Zap} title="Recent XP" />
          {p.recent.length ? (
            <ul className="divide-y divide-slate-100">
              {p.recent.map((r, i) => {
                const Icon = SOURCE_ICON[r.source] ?? Zap;
                return (
                  <li key={i} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-ink-soft"><Icon className="h-4 w-4" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">{r.label}</div>
                      <div className="text-xs text-ink-mute">{new Date(r.occurredAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</div>
                    </div>
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">+{r.points} XP</span>
                  </li>
                );
              })}
            </ul>
          ) : <Empty icon={Zap} title="No XP yet"><Link to="/learn" className="font-semibold text-brand-700 hover:underline">Start a lesson</Link></Empty>}
        </Card>
        <Leaderboard />
      </div>
    </div>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function Kpi({ icon: Icon, tone, label, value, hint }: { icon: typeof Zap; tone: string; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-3">
      <span className={cx("flex h-8 w-8 items-center justify-center rounded-lg", tone)}><Icon className="h-4 w-4" aria-hidden /></span>
      <div className="mt-2 font-display text-xl font-bold text-ink">{value}</div>
      <div className="text-xs text-ink-mute">{label}{hint && ` · ${hint}`}</div>
    </div>
  );
}

export function LevelRing({ xp, p, size = 148 }: { xp: number; p: Pick<Progress, "level">; size?: number }) {
  const pct = levelPercent(xp, p.level);
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} role="img" aria-label={`Level ${p.level.number}, ${Math.round(pct)}% to next level`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="lvl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fe9603" /><stop offset="100%" stopColor="#ff6203" /></linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#lvl)" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Crown className="h-5 w-5 text-brand-500" aria-hidden />
        <span className="font-display text-4xl font-bold leading-none text-ink">{p.level.number}</span>
        <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-mute">Level</span>
      </div>
    </div>
  );
}

function Heatmap({ activity }: { activity: Progress["activity"] }) {
  const byDay = new Map(activity.map((a) => [a.date.slice(0, 10), a]));
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 83));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7)); // Monday
  const weeks: Date[][] = [];
  for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    if (!weeks.length || weeks[weeks.length - 1]!.length === 7) weeks.push([]);
    weeks[weeks.length - 1]!.push(new Date(d));
  }
  const max = Math.max(1, ...activity.map((a) => a.points));
  const shade = (pts: number) => (pts === 0 ? "bg-slate-100" : pts / max > 0.66 ? "bg-brand-600" : pts / max > 0.33 ? "bg-brand-400" : "bg-brand-200");
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {weeks.map((w, i) => (
          <div key={i} className="flex flex-col gap-1">
            {w.map((d) => {
              const key = d.toISOString().slice(0, 10);
              const a = byDay.get(key);
              return <span key={key} title={`${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}: ${a ? `${a.points} XP` : "no activity"}`} className={cx("h-4 w-4 rounded-[4px]", shade(a?.points ?? 0))} />;
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-mute">
        Less <span className="h-3 w-3 rounded-[3px] bg-slate-100" /><span className="h-3 w-3 rounded-[3px] bg-brand-200" /><span className="h-3 w-3 rounded-[3px] bg-brand-400" /><span className="h-3 w-3 rounded-[3px] bg-brand-600" /> More
      </div>
    </div>
  );
}

interface Board { period: string; rows: { rank: number; name: string; xp: number; isMe: boolean }[]; me?: { rank: number; xp: number } | null }

function Leaderboard() {
  const { me } = useAuth();
  const [period, setPeriod] = useState<"week" | "all">("week");
  const board = useQuery({ queryKey: ["leaderboard", period], queryFn: () => api<Board>(`/leaderboard?period=${period}`) });
  const medal = ["bg-yellow-400 text-white", "bg-slate-300 text-white", "bg-amber-600 text-white"];
  return (
    <Card>
      <CardHeader icon={Trophy} title="Leaderboard" action={<Segmented value={period} onChange={setPeriod} items={[{ value: "week", label: "This week" }, { value: "all", label: "All time" }]} />} />
      {!board.data?.rows.length ? <Empty icon={Trophy} title="No XP earned yet" /> : (
        <ol className="space-y-1 px-3 pb-4">
          {board.data.rows.map((r) => (
            <li key={r.rank} className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5", r.isMe && "bg-brand-50 ring-1 ring-brand-200")}>
              <span className={cx("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", medal[r.rank - 1] ?? "bg-slate-100 text-ink-soft")}>{r.rank}</span>
              <Avatar name={r.isMe ? me?.fullName ?? "You" : r.name} className="h-8 w-8 text-xs" />
              <span className={cx("flex-1 truncate text-sm", r.isMe ? "font-bold text-ink" : "font-medium text-ink-soft")}>{r.name}</span>
              <span className="text-sm font-bold tabular-nums text-ink">{r.xp.toLocaleString()} XP</span>
            </li>
          ))}
        </ol>
      )}
      {board.data?.me && board.data.me.rank > 10 && <p className="px-5 pb-4 text-sm text-ink-mute">You're #{board.data.me.rank} with {board.data.me.xp} XP.</p>}
    </Card>
  );
}
