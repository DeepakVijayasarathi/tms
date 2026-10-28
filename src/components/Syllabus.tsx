import { useState } from "react";
import { Award, BookOpen, CheckCircle2, ChevronDown, ChevronRight, Circle, ClipboardCheck, Eye, Flag, ListChecks, PlayCircle, Target, Video } from "lucide-react";
import { minutes } from "@/lib/format";
import { toDate } from "@/lib/classes";
import { Card, CardHeader, Empty, IconTile, Progress, StatusBadge, cx, type TileTone } from "./ui";

export type MilestoneKind = "CompleteModule" | "PassAssessment" | "AttendClasses";
export interface SyllabusModule {
  id: string;
  title: string;
  week?: number | null;
  objectives?: string | null;
  lessons: { id: string; title: string; kind?: string; durationMinutes: number; isPreview?: boolean }[];
}
export interface MilestoneDef { id: string; title: string; description?: string | null; kind: MilestoneKind; target?: string | null; requiredCount?: number; dueDays?: number | null }
export interface MilestoneProgress { id: string; title: string; description?: string | null; kind: MilestoneKind; target?: string | null; current: number; total: number; dueAt?: string | null; achieved: boolean }

export const lines = (text?: string | null) => (text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

const kindMeta: Record<MilestoneKind, { icon: typeof Flag; tone: TileTone; verb: string }> = {
  CompleteModule: { icon: BookOpen, tone: "violet", verb: "Complete module" },
  PassAssessment: { icon: ClipboardCheck, tone: "amber", verb: "Pass assessment" },
  AttendClasses: { icon: Video, tone: "red", verb: "Attend" },
};
export const milestoneTarget = (m: { kind: MilestoneKind; target?: string | null; requiredCount?: number }) =>
  m.kind === "AttendClasses" ? (m.target ?? `${m.requiredCount ?? 1} live class${(m.requiredCount ?? 1) === 1 ? "" : "es"}`) : m.target ?? "—";

/** Outcomes, prerequisites and the week-by-week plan. */
export function SyllabusPanel({ outcomes, prerequisites, modules }: { outcomes?: string; prerequisites?: string; modules: SyllabusModule[] }) {
  const outcomeList = lines(outcomes);
  const prereqList = lines(prerequisites);
  const weeks = [...modules].sort((a, b) => (a.week ?? 999) - (b.week ?? 999));
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader icon={Target} title="What you'll learn" subtitle="Learning outcomes for this course" />
          {outcomeList.length ? (
            <ul className="grid gap-2.5 px-5 pb-5 sm:grid-cols-2">
              {outcomeList.map((o) => (
                <li key={o} className="flex gap-2 text-sm text-ink-soft"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />{o}</li>
              ))}
            </ul>
          ) : <p className="px-5 pb-5 text-sm text-ink-mute">The instructor hasn't listed outcomes yet.</p>}
        </Card>
        <Card>
          <CardHeader icon={ListChecks} title="Prerequisites" subtitle="Before you start" />
          {prereqList.length ? (
            <ul className="space-y-2.5 px-5 pb-5">
              {prereqList.map((p) => <li key={p} className="flex gap-2 text-sm text-ink-soft"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />{p}</li>)}
            </ul>
          ) : <p className="px-5 pb-5 text-sm text-ink-mute">No prerequisites.</p>}
        </Card>
      </div>

      <Card>
        <CardHeader icon={BookOpen} title="Weekly plan" subtitle={`${modules.length} module${modules.length === 1 ? "" : "s"} · ${minutes(modules.flatMap((m) => m.lessons).reduce((s, l) => s + l.durationMinutes, 0))}`} />
        <ol className="relative space-y-4 px-5 pb-5">
          {weeks.map((m, i) => (
            <li key={m.id} className="flex gap-4">
              <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-brand-50 py-2 text-brand-700">
                <span className="text-[10px] font-bold uppercase tracking-wider">{m.week ? "Week" : "Part"}</span>
                <span className="font-display text-xl font-bold leading-none">{m.week ?? i + 1}</span>
              </div>
              <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink">{m.title}</h3>
                  <span className="text-xs text-ink-mute">{m.lessons.length} lessons · {minutes(m.lessons.reduce((s, l) => s + l.durationMinutes, 0))}</span>
                </div>
                {lines(m.objectives).length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {lines(m.objectives).map((o) => <li key={o} className="flex gap-2 text-sm text-ink-soft"><Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden />{o}</li>)}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

/** Modules and lessons as an accordion. Learners see completion ticks; visitors can open free previews. */
export function CurriculumList({ modules, completed, onPreview, onOpen, activeLessonId }: {
  modules: SyllabusModule[];
  completed?: Set<string>;
  onPreview?: (lessonId: string) => void;
  onOpen?: (lessonId: string) => void;
  activeLessonId?: string | null;
}) {
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setClosed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <Card>
      <CardHeader icon={PlayCircle} title="Curriculum" subtitle={`${modules.flatMap((m) => m.lessons).length} lessons · ${minutes(modules.flatMap((m) => m.lessons).reduce((s, l) => s + l.durationMinutes, 0))}`} />
      <ol className="divide-y divide-slate-100 border-t border-slate-100">
        {modules.map((m, i) => {
          const open = !closed.has(m.id);
          const done = completed ? m.lessons.filter((l) => completed.has(l.id)).length : 0;
          return (
            <li key={m.id}>
              <button className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50" onClick={() => toggle(m.id)} aria-expanded={open}>
                {open ? <ChevronDown className="h-4 w-4 text-ink-mute" /> : <ChevronRight className="h-4 w-4 text-ink-mute" />}
                <span className="flex-1 font-semibold text-ink">{m.week ? `Week ${m.week} · ` : `${i + 1}. `}{m.title}</span>
                <span className="text-xs text-ink-mute">{completed ? `${done}/${m.lessons.length} done` : `${m.lessons.length} lessons`}</span>
              </button>
              {open && (
                <ul className="pb-2">
                  {m.lessons.map((l) => {
                    const isDone = completed?.has(l.id);
                    const row = (
                      <>
                        {completed ? (isDone ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />)
                          : <PlayCircle className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />}
                        <span className="flex-1 text-left">{l.title}</span>
                        {l.isPreview && onPreview && (
                          <span role="button" tabIndex={0} className="flex items-center gap-1 font-semibold text-brand-700 hover:underline" onClick={(e) => { e.stopPropagation(); onPreview(l.id); }} onKeyDown={(e) => { if (e.key === "Enter") onPreview(l.id); }}>
                            <Eye className="h-3.5 w-3.5" aria-hidden /> Preview
                          </span>
                        )}
                        <span className="text-ink-mute">{l.durationMinutes} min</span>
                      </>
                    );
                    const cls = cx("flex w-full items-center gap-2.5 py-2 pl-12 pr-5 text-sm text-ink-soft", activeLessonId === l.id && "bg-brand-50 font-semibold text-brand-800");
                    return <li key={l.id}>{onOpen ? <button className={cx(cls, "hover:bg-slate-50")} onClick={() => onOpen(l.id)}>{row}</button> : <div className={cls}>{row}</div>}</li>;
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function milestoneState(m: MilestoneProgress, now: number) {
  if (m.achieved) return "Achieved";
  if (!m.dueAt) return "Upcoming";
  const due = toDate(m.dueAt).getTime();
  if (due < now) return "Overdue";
  return due - now < 3 * 86_400_000 ? "Due" : "Upcoming";
}

/** Milestone path. With `progress`, shows the learner's status; with `defs`, shows what the course expects. */
export function MilestoneTimeline({ progress, defs }: { progress?: MilestoneProgress[]; defs?: MilestoneDef[] }) {
  const now = Date.now();
  const items = progress ?? defs ?? [];
  if (!items.length) return <Card><Empty icon={Flag} title="No milestones yet">The instructor hasn't set milestones for this course.</Empty></Card>;
  const achieved = progress?.filter((m) => m.achieved).length ?? 0;

  return (
    <Card>
      <CardHeader
        icon={Flag}
        title="Milestones"
        subtitle={progress ? `${achieved} of ${progress.length} achieved` : "Checkpoints on the way to your certificate"}
        action={progress && <span className="font-display text-xl font-bold text-ink">{Math.round((achieved / progress.length) * 100)}%</span>}
      />
      {progress && <div className="px-5 pb-2"><Progress value={(achieved / progress.length) * 100} /></div>}
      <ol className="relative px-5 pb-5 pt-3">
        {items.map((m, i) => {
          const meta = kindMeta[m.kind];
          const p = progress?.[i];
          const state = p ? milestoneState(p, now) : null;
          const last = i === items.length - 1;
          return (
            <li key={m.id} className="relative flex gap-4 pb-5 last:pb-0">
              {!last && <span className={cx("absolute left-5 top-11 h-[calc(100%-2.75rem)] w-0.5", p?.achieved ? "bg-emerald-300" : "bg-slate-200")} aria-hidden />}
              {p?.achieved
                ? <IconTile icon={Award} tone="green" className="relative z-10 ring-4 ring-white" />
                : <IconTile icon={meta.icon} tone={state === "Overdue" ? "red" : meta.tone} className="relative z-10 ring-4 ring-white" />}
              <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink">{m.title}</h3>
                  {state && <StatusBadge status={state} label={state === "Due" ? "Due soon" : undefined} />}
                </div>
                <p className="mt-0.5 text-[13px] text-ink-mute">{meta.verb}: <span className="font-medium text-ink-soft">{milestoneTarget(m)}</span></p>
                {m.description && <p className="mt-1 text-sm text-ink-soft">{m.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-mute">
                  {p ? (
                    <>
                      {p.dueAt && <span>Due {toDate(p.dueAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>}
                      {p.total > 1 && <span className="flex items-center gap-2">{p.current}/{p.total}<Progress value={(p.current / p.total) * 100} className="h-1.5 w-24" /></span>}
                    </>
                  ) : (defs?.[i]?.dueDays != null ? <span>Due {defs[i]!.dueDays} days after you enrol</span> : <span>No deadline</span>)}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
