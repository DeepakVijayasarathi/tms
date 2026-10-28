import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Award, Bot, Brain, CheckCircle2, Circle, ClipboardCheck, Flag, MessageSquare, Send, Video, X } from "lucide-react";
import { api, post, put } from "@/lib/api";
import { dateTime } from "@/lib/format";
import type { Eligibility } from "@/lib/types";
import { Badge, Button, Card, CardHeader, ErrorNote, LiveBadge, Progress, Spinner, StatusBadge, Tabs, cx } from "@/components/ui";
import { MilestoneTimeline, SyllabusPanel, type MilestoneProgress } from "@/components/Syllabus";
import { JOIN_EARLY_MINUTES, canEnter, relative, toDate, useNow, type SessionStatus } from "@/lib/classes";
import { RichText } from "@/components/RichText";

interface Player {
  id: string;
  status: string;
  course: { id: string; slug: string; title: string };
  modules: { id: string; title: string; week?: number | null; objectives?: string | null; lessons: { id: string; title: string; kind: string; content: string; mediaUrl?: string; durationMinutes: number }[] }[];
  syllabus: { learningOutcomes: string; prerequisites: string };
  milestones: MilestoneProgress[];
  completedLessonIds: string[];
  assessments: { id: string; title: string; passMarkPercent: number; timeLimitMinutes?: number; maxAttempts: number; questions: number; attemptsUsed: number; bestScore?: number; passed: boolean; inProgressAttemptId?: string }[];
  eligibility: Eligibility;
  certificate?: { id: string; credentialCode: string } | null;
}
interface Session { id: string; title: string; startsAt: string; endsAt: string; status: SessionStatus; location?: string; capacity: number; registered: number; myStatus?: string }

export function Learn() {
  const { enrollmentId } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const player = useQuery({ queryKey: ["player", enrollmentId], queryFn: () => api<Player>(`/enrollments/${enrollmentId}`) });
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tab, setTab] = useState<"lessons" | "syllabus" | "milestones">("lessons");

  const lessons = player.data?.modules.flatMap((m) => m.lessons) ?? [];
  const current = lessons.find((l) => l.id === lessonId) ?? lessons.find((l) => !player.data?.completedLessonIds.includes(l.id)) ?? lessons[0];
  const done = new Set(player.data?.completedLessonIds ?? []);

  const complete = useMutation({
    mutationFn: (id: string) => put<{ certificateCode?: string }>(`/enrollments/${enrollmentId}/lessons/${id}/progress`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["player", enrollmentId] });
      const idx = lessons.findIndex((l) => l.id === current?.id);
      if (idx >= 0 && idx < lessons.length - 1) setLessonId(lessons[idx + 1].id);
    },
  });

  const startAttempt = useMutation({
    mutationFn: (assessmentId: string) => post<{ id: string }>(`/assessments/${assessmentId}/attempts`),
    onSuccess: (a) => navigate(`/attempts/${a.id}`),
  });

  if (player.isLoading) return <Spinner />;
  if (!player.data) return <ErrorNote error={player.error} />;
  const p = player.data;
  const e = p.eligibility;
  const pct = e.lessonsTotal ? (e.lessonsCompleted / e.lessonsTotal) * 100 : 0;
  const milestonesDone = p.milestones.filter((m) => m.achieved).length;
  const nextMilestone = p.milestones.find((m) => !m.achieved);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="p-4">
          <Link to={`/courses/${p.course.slug}`} className="font-semibold text-ink hover:text-brand-700">{p.course.title}</Link>
          <div className="mt-3"><Progress value={pct} /></div>
          <p className="mt-1.5 text-xs text-ink-mute">{e.lessonsCompleted}/{e.lessonsTotal} lessons complete</p>
        </Card>
        <Link to={`/practice/${p.id}`} className="group flex items-center gap-3 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 transition-shadow hover:shadow-md">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white"><Brain className="h-5 w-5" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink">Practice with AI</span>
            <span className="block text-xs text-ink-mute">5 quick questions · earn XP</span>
          </span>
          <ArrowRight className="h-4 w-4 text-violet-600 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
        {e.vivaRequired && (
          <Link to={`/viva/${p.id}`} className="group flex items-center gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 transition-shadow hover:shadow-md">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white"><MessageSquare className="h-5 w-5" aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">AI interview</span>
              <span className="block text-xs text-ink-mute">{e.vivaPassed ? "Passed ✓" : "Required for your certificate"}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-indigo-600 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        )}
        {nextMilestone && (
          <button onClick={() => setTab("milestones")} className="block w-full rounded-2xl border border-brand-200 bg-brand-50 p-4 text-left transition-colors hover:bg-brand-100">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-700"><Flag className="h-3.5 w-3.5" aria-hidden />Next milestone</span>
              <span className="text-xs font-semibold text-ink-mute">{milestonesDone}/{p.milestones.length}</span>
            </div>
            <div className="mt-1.5 font-semibold text-ink">{nextMilestone.title}</div>
            {nextMilestone.dueAt && <div className="text-xs text-ink-mute">Due {toDate(nextMilestone.dueAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</div>}
          </button>
        )}
        <Card className="max-h-[50vh] overflow-y-auto p-2">
          {p.modules.map((m) => (
            <div key={m.id} className="mb-2">
              <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-mute">{m.week ? `Week ${m.week} · ` : ""}{m.title}</div>
              {m.lessons.map((l) => (
                <button
                  key={l.id}
                  onClick={() => { setLessonId(l.id); setTab("lessons"); }}
                  className={cx("flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm", current?.id === l.id ? "bg-brand-50 text-brand-800" : "text-ink-soft hover:bg-slate-50")}
                >
                  {done.has(l.id) ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Completed" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />}
                  <span className="flex-1">{l.title}</span>
                </button>
              ))}
            </div>
          ))}
        </Card>
      </aside>

      <div className="min-w-0 space-y-6">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "lessons", label: "Lessons & assessments" },
            { value: "syllabus", label: "Syllabus" },
            { value: "milestones", label: `Milestones${p.milestones.length ? ` (${milestonesDone}/${p.milestones.length})` : ""}` },
          ]}
        />
        {tab === "syllabus" && <SyllabusPanel outcomes={p.syllabus.learningOutcomes} prerequisites={p.syllabus.prerequisites} modules={p.modules} />}
        {tab === "milestones" && <MilestoneTimeline progress={p.milestones} />}
        {tab === "lessons" && <>
        {current && (
          <Card>
            <CardHeader title={current.title} subtitle={`${current.durationMinutes} min`} action={
              <Button variant="secondary" size="sm" onClick={() => setTutorOpen(true)}><Bot className="h-4 w-4" aria-hidden /> Ask the AI tutor</Button>
            } />
            <div className="p-6">
              {current.mediaUrl && (
                <a href={current.mediaUrl} target="_blank" rel="noreferrer" className="mb-4 inline-block text-sm font-medium text-brand-700 hover:underline">Open lesson resource ↗</a>
              )}
              <RichText text={current.content} />
              <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
                {done.has(current.id) ? (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden /> Completed</span>
                ) : (
                  <Button loading={complete.isPending} onClick={() => complete.mutate(current.id)}>Mark complete</Button>
                )}
                <ErrorNote error={complete.error} />
              </div>
            </div>
          </Card>
        )}

        {p.assessments.length > 0 && (
          <Card>
            <CardHeader title="Assessments" subtitle="Scores are calculated on the server when you submit." />
            <ul className="divide-y divide-slate-100">
              {p.assessments.map((a) => {
                const remaining = a.maxAttempts - a.attemptsUsed;
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <ClipboardCheck className="h-6 w-6 text-brand-600" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{a.title}</div>
                      <div className="text-sm text-ink-mute">
                        {a.questions} questions · pass at {a.passMarkPercent}%{a.timeLimitMinutes && ` · ${a.timeLimitMinutes} min`} · {remaining} of {a.maxAttempts} attempts left
                        {a.bestScore != null && ` · best ${a.bestScore}%`}
                      </div>
                    </div>
                    {a.passed ? <Badge tone="green">Passed</Badge> : (
                      <Button
                        variant={e.lessonsCompleted < e.lessonsTotal ? "secondary" : "primary"}
                        disabled={remaining <= 0 && !a.inProgressAttemptId}
                        loading={startAttempt.isPending}
                        onClick={() => a.inProgressAttemptId ? navigate(`/attempts/${a.inProgressAttemptId}`) : startAttempt.mutate(a.id)}
                      >
                        {a.inProgressAttemptId ? "Resume" : a.attemptsUsed ? "Retake" : "Start"}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="px-5 pb-4"><ErrorNote error={startAttempt.error} /></div>
          </Card>
        )}

        <Sessions courseId={p.course.id} />

        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-4">
            <Award className={cx("h-10 w-10", p.certificate ? "text-amber-500" : "text-slate-300")} aria-hidden />
            <div className="flex-1">
              <h3 className="font-semibold">Certificate</h3>
              {p.certificate ? (
                <p className="text-sm text-ink-mute">Earned · credential {p.certificate.credentialCode}</p>
              ) : (
                <ul className="mt-1 space-y-0.5 text-sm text-ink-mute">
                  <Req ok={e.lessonsCompleted >= e.lessonsTotal}>Complete all lessons ({e.lessonsCompleted}/{e.lessonsTotal})</Req>
                  {e.assessmentsTotal > 0 && <Req ok={e.assessmentsPassed >= e.assessmentsTotal}>Pass assessments ({e.assessmentsPassed}/{e.assessmentsTotal})</Req>}
                  {e.sessionsRequired > 0 && <Req ok={e.sessionsAttended >= e.sessionsRequired}>Attend live sessions ({e.sessionsAttended}/{e.sessionsRequired})</Req>}
                  {e.vivaRequired && <Req ok={!!e.vivaPassed}>Pass the <Link to={`/viva/${p.id}`} className="font-semibold text-brand-700 hover:underline">AI interview</Link></Req>}
                </ul>
              )}
            </div>
            {p.certificate && <Link to={`/verify/${p.certificate.credentialCode}`} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">View certificate</Link>}
          </div>
        </Card>
        </>}
      </div>

      {tutorOpen && <Tutor courseId={p.course.id} onClose={() => setTutorOpen(false)} />}
    </div>
  );
}

function Req({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <li className="flex items-center gap-1.5">{ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> : <Circle className="h-3.5 w-3.5" aria-hidden />}{children}</li>;
}

function Sessions({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const now = useNow();
  const sessions = useQuery({ queryKey: ["sessions", courseId], queryFn: () => api<Session[]>(`/courses/${courseId}/sessions`), refetchInterval: 60_000 });
  const register = useMutation({
    mutationFn: (id: string) => post(`/sessions/${id}/register`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions", courseId] }),
  });
  const visible = sessions.data?.filter((s) => s.status !== "Cancelled") ?? [];
  if (!visible.length) return null;
  return (
    <Card>
      <CardHeader icon={Video} title="Live classes" subtitle="Join in the built-in classroom — attendance is recorded automatically." />
      <ul className="divide-y divide-slate-100">
        {visible.map((s) => {
          const open = canEnter({ ...s, isHost: false }, now);
          const done = s.status === "Ended" || (s.status !== "Live" && toDate(s.endsAt).getTime() < now);
          return (
            <li key={s.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <span className={cx("flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-xs font-bold leading-tight", s.status === "Live" ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-800")}>
                <span>{toDate(s.startsAt).toLocaleDateString(undefined, { day: "numeric" })}</span>
                <span className="text-[10px] uppercase">{toDate(s.startsAt).toLocaleDateString(undefined, { month: "short" })}</span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{s.title}</span>{s.status === "Live" && <LiveBadge />}</div>
                <div className="text-sm text-ink-mute">{dateTime(s.startsAt)} · {s.location ?? "Online classroom"} · {s.registered}/{s.capacity} seats</div>
              </div>
              {s.myStatus && done ? <StatusBadge status={s.myStatus} /> : open ? (
                <Link to={`/classes/${s.id}/room`} className={cx("flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white", s.status === "Live" ? "bg-red-600 hover:bg-red-700" : "bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700")}>
                  <Video className="h-4 w-4" aria-hidden /> Join
                </Link>
              ) : done ? <Badge>Ended</Badge> : s.myStatus ? (
                <span className="text-right text-xs text-ink-mute"><StatusBadge status={s.myStatus} /><span className="mt-1 block">Opens {relative(new Date(toDate(s.startsAt).getTime() - JOIN_EARLY_MINUTES * 60_000).toISOString(), now)}</span></span>
              ) : (
                <Button size="sm" variant="secondary" disabled={s.registered >= s.capacity} loading={register.isPending && register.variables === s.id} onClick={() => register.mutate(s.id)}>
                  {s.registered >= s.capacity ? "Full" : "Save my seat"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="px-5 pb-3"><ErrorNote error={register.error} /></div>
    </Card>
  );
}

interface ChatMsg { role: string; content: string; sources?: { lessonId: string; title: string }[] }

function Tutor({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const end = useRef<HTMLDivElement>(null);

  const history = useQuery({ queryKey: ["ai-history", courseId], queryFn: () => api<ChatMsg[]>(`/ai/chat/${courseId}/history`) });
  useEffect(() => { if (history.data) setMessages(history.data); }, [history.data]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ask = useMutation({
    mutationFn: (message: string) => post<{ answer: string; sources: { lessonId: string; title: string }[] }>("/ai/chat", { courseId, message }),
    onSuccess: (r) => setMessages((m) => [...m, { role: "assistant", content: r.answer, sources: r.sources }]),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || ask.isPending) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    ask.mutate(text);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/20" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="AI tutor">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <Bot className="h-5 w-5 text-brand-600" aria-hidden />
          <div className="flex-1">
            <div className="font-semibold">AI tutor</div>
            <div className="text-xs text-ink-mute">Answers from this course's lessons</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-ink-mute">
              Ask about anything in this course — "explain this lesson more simply", "give me an example", or "quiz me on cleaning data".
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cx("max-w-[90%] rounded-xl px-3.5 py-2.5 text-sm", m.role === "user" ? "ml-auto bg-brand-600 text-white" : "bg-slate-100")}>
              {m.role === "user" ? m.content : <RichText text={m.content} />}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {m.sources.map((s) => <Badge key={s.lessonId} tone="blue">{s.title}</Badge>)}
                </div>
              )}
            </div>
          ))}
          {ask.isPending && <div className="text-sm text-ink-mute">Thinking…</div>}
          <ErrorNote error={ask.error} />
          <div ref={end} />
        </div>
        <form onSubmit={submit} className="flex gap-2 border-t border-slate-200 p-3">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" aria-label="Your question" />
          <Button type="submit" disabled={!input.trim()} loading={ask.isPending} aria-label="Send"><Send className="h-4 w-4" aria-hidden /></Button>
        </form>
      </div>
    </div>
  );
}
