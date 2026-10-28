import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bot, CheckCircle2, ChevronDown, Clock, MessageSquare, RotateCcw, Send, ShieldCheck, Sparkles, ThumbsUp, TrendingUp, XCircle } from "lucide-react";
import { api, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar, Button, Card, ErrorNote, Spinner, cx } from "@/components/ui";

interface Turn { role: "interviewer" | "learner"; text: string; followUp?: boolean }
interface Result { overallPercent: number; criteria: { name: string; score: number; comment: string }[]; strengths: string[]; improvements: string[]; summary: string }
interface Session { id: string; status: "InProgress" | "Completed" | "Abandoned"; mainQuestions: number; maxQuestions: number; passMarkPercent: number; scorePercent?: number; passed: boolean; transcript: Turn[]; result?: Result | null }
interface Info { enabled: boolean; vivaPassMarkPercent: number; vivaQuestionCount: number; maxAttempts: number; attemptsUsed: number; passed: boolean; bestScore?: number; open?: Session | null; history: { id: string; scorePercent?: number; passed: boolean; completedAt?: string }[] }

export function Viva() {
  const { enrollmentId } = useParams();
  const qc = useQueryClient();
  const info = useQuery({ queryKey: ["viva", enrollmentId], queryFn: () => api<Info>(`/viva/${enrollmentId}`) });
  const course = useQuery({ queryKey: ["player", enrollmentId], queryFn: () => api<{ course: { title: string } }>(`/enrollments/${enrollmentId}`) });
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => { if (info.data?.open && !session) setSession(info.data.open); }, [info.data, session]);

  const start = useMutation({ mutationFn: () => post<Session>(`/viva/${enrollmentId}/sessions`), onSuccess: setSession });
  const done = () => { qc.invalidateQueries({ queryKey: ["viva", enrollmentId] }); qc.invalidateQueries({ queryKey: ["player", enrollmentId] }); qc.invalidateQueries({ queryKey: ["progress"] }); };

  const back = (
    <Link to={`/learn/${enrollmentId}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-mute hover:text-ink">
      <ArrowLeft className="h-4 w-4" aria-hidden />{course.data?.course.title ?? "Back to course"}
    </Link>
  );

  if (info.isLoading) return <Spinner label="Loading interview" />;
  if (!info.data) return <ErrorNote error={info.error} />;
  const i = info.data;

  if (session?.status === "Completed") return <div className="mx-auto max-w-4xl space-y-5">{back}<Scorecard s={session} info={i} onRetake={() => { setSession(null); start.mutate(); }} retaking={start.isPending} /></div>;
  if (session?.status === "InProgress") return <div className="mx-auto max-w-4xl space-y-5">{back}<Chat s={session} onUpdate={(s) => { setSession(s); if (s.status === "Completed") done(); }} onQuit={() => { setSession(null); done(); }} /></div>;

  const attemptsLeft = i.maxAttempts - i.attemptsUsed;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {back}
      <Card className="overflow-hidden">
        <div className="relative bg-navy px-6 py-10 text-white sm:px-10">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 100% 100%, rgb(124 58 237 / .45), transparent 50%), radial-gradient(circle at 0% 0%, rgb(255 122 3 / .2), transparent 45%)" }} />
          <div className="relative grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-200"><MessageSquare className="h-3.5 w-3.5" aria-hidden />AI interview</span>
              <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Talk it through with your AI examiner</h1>
              <p className="mt-2 text-white/75">A short, conversational test on {course.data ? <span className="font-semibold text-white">{course.data.course.title}</span> : "this course"}. The interviewer asks questions, follows up on your answers, and scores the conversation.</p>
              {!i.enabled ? <p className="mt-6 rounded-xl bg-white/10 px-4 py-3 text-sm">This course doesn't include an AI interview.</p>
                : i.passed ? <p className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-200"><CheckCircle2 className="h-5 w-5" aria-hidden />You passed this interview{i.bestScore != null && ` with ${i.bestScore}%`}.</p>
                : attemptsLeft <= 0 ? <p className="mt-6 rounded-xl bg-white/10 px-4 py-3 text-sm">You've used all {i.maxAttempts} attempts.</p>
                : <Button size="lg" className="mt-6" loading={start.isPending} onClick={() => start.mutate()}><Sparkles className="h-4 w-4" aria-hidden />{start.isPending ? "Preparing your interviewer…" : "Start interview"}</Button>}
              <div className="mt-3"><ErrorNote error={start.error} /></div>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm">
              <Fact icon={MessageSquare} label={`${i.vivaQuestionCount} main questions`} hint="plus a follow-up if an answer needs one" />
              <Fact icon={ShieldCheck} label={`Pass mark ${i.vivaPassMarkPercent}%`} hint="required for this course's certificate" />
              <Fact icon={RotateCcw} label={`${Math.max(0, attemptsLeft)} of ${i.maxAttempts} attempts left`} />
              <Fact icon={Clock} label="About 10 minutes" hint="answer in your own words" />
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-3">
          <Tip n={1} title="Explain, don't recite" text="Short answers in your own words score well when they're correct." />
          <Tip n={2} title="Use examples" text="Applying an idea to a situation shows real understanding." />
          <Tip n={3} title="It's okay to think" text="There's no timer — take a moment before you answer." />
        </div>
      </Card>
      {i.history.length > 0 && (
        <Card>
          <div className="px-5 pb-2 pt-5 font-display text-[17px] font-bold text-ink">Your attempts</div>
          <ul className="divide-y divide-slate-100">
            {i.history.map((h, n) => (
              <li key={h.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                {h.passed ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden /> : <XCircle className="h-5 w-5 text-amber-600" aria-hidden />}
                <span className="flex-1 text-ink-soft">Attempt {i.history.length - n} · {h.passed ? "passed" : "not passed"}</span>
                <span className="text-xs text-ink-mute">{h.completedAt ? new Date(h.completedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : ""}</span>
                <span className={cx("rounded-full px-2.5 py-0.5 text-xs font-bold", h.passed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{h.scorePercent ?? 0}%</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Fact({ icon: Icon, label, hint }: { icon: typeof Clock; label: string; hint?: string }) {
  return <div className="flex gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-200" aria-hidden /><div><div className="font-semibold">{label}</div>{hint && <div className="text-white/60">{hint}</div>}</div></div>;
}
function Tip({ n, title, text }: { n: number; title: string; text: string }) {
  return <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 font-bold text-violet-700">{n}</span><div><div className="font-semibold text-ink">{title}</div><div className="text-sm text-ink-mute">{text}</div></div></div>;
}

function Chat({ s, onUpdate, onQuit }: { s: Session; onUpdate: (s: Session) => void; onQuit: () => void }) {
  const { me } = useAuth();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const reply = useMutation({
    mutationFn: (answer: string) => post<Session>(`/viva/sessions/${s.id}/answers`, { answer }),
    onSuccess: (next) => { setPending(null); onUpdate(next); },
    onError: () => setPending(null),
  });
  const quit = useMutation({ mutationFn: () => post(`/viva/sessions/${s.id}/abandon`), onSuccess: onQuit });
  // If scoring failed earlier the transcript ends with the learner — offer a retry instead of a new answer.
  const awaitingScore = s.transcript[s.transcript.length - 1]?.role === "learner";
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [s.transcript.length, pending, reply.isPending]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const answer = text.trim();
    if ((!answer && !awaitingScore) || reply.isPending) return;
    setPending(awaitingScore ? null : answer);
    setText("");
    reply.mutate(answer || "retry");
  };
  const last = s.mainQuestions >= s.maxQuestions;

  return (
    <Card className="flex h-[calc(100vh-11rem)] min-h-[520px] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white"><Bot className="h-5 w-5" aria-hidden /></span>
        <div className="flex-1">
          <div className="font-semibold text-ink">AI Interviewer</div>
          <div className="text-xs text-ink-mute">Question {Math.min(s.mainQuestions, s.maxQuestions)} of {s.maxQuestions} · pass mark {s.passMarkPercent}%</div>
        </div>
        <div className="hidden gap-1 sm:flex">{Array.from({ length: s.maxQuestions }, (_, i) => <span key={i} className={cx("h-1.5 w-8 rounded-full", i < s.mainQuestions ? "bg-violet-500" : "bg-slate-200")} />)}</div>
        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Leave the interview? This attempt won't be scored and you'll start fresh next time.")) quit.mutate(); }}>End</Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-5 py-5">
        {s.transcript.map((t, i) => <Bubble key={i} t={t} name={me?.fullName ?? "You"} />)}
        {pending && <Bubble t={{ role: "learner", text: pending }} name={me?.fullName ?? "You"} />}
        {reply.isPending && (
          <div className="flex items-center gap-2 text-sm text-ink-mute">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white"><Bot className="h-4 w-4" aria-hidden /></span>
            <span className="flex gap-1 rounded-2xl bg-white px-4 py-3 shadow-card"><Dot d="0ms" /><Dot d="150ms" /><Dot d="300ms" /></span>
            {last && <span>Scoring your interview…</span>}
          </div>
        )}
        <ErrorNote error={reply.error} />
        <div ref={end} />
      </div>

      <form onSubmit={submit} className="border-t border-slate-100 bg-white p-4">
        {awaitingScore ? (
          <Button className="w-full" loading={reply.isPending} onClick={() => submit()} type="button">Submit for scoring</Button>
        ) : (
          <div className="flex items-end gap-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(); }}
              placeholder="Type your answer… (Ctrl + Enter to send)"
              maxLength={2000}
              rows={3}
              disabled={reply.isPending}
              aria-label="Your answer"
              className="min-h-[3.5rem] flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
            />
            <Button type="submit" size="lg" className="!bg-violet-600 hover:!bg-violet-700" disabled={!text.trim()} loading={reply.isPending} aria-label="Send answer"><Send className="h-4 w-4" aria-hidden /></Button>
          </div>
        )}
      </form>
    </Card>
  );
}

function Dot({ d }: { d: string }) {
  return <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: d }} />;
}

function Bubble({ t, name }: { t: Turn; name: string }) {
  const ai = t.role === "interviewer";
  return (
    <div className={cx("flex items-end gap-2.5", !ai && "flex-row-reverse")}>
      {ai ? <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white"><Bot className="h-4 w-4" aria-hidden /></span> : <Avatar name={name} className="h-8 w-8 text-xs" />}
      <div className={cx("max-w-[78%] rounded-2xl px-4 py-3 text-[15px] leading-6", ai ? "rounded-bl-md bg-white text-ink shadow-card" : "rounded-br-md bg-violet-600 text-white")}>
        {ai && t.followUp && <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-violet-600">Follow-up</div>}
        <p className="whitespace-pre-wrap">{t.text}</p>
      </div>
    </div>
  );
}

function Scorecard({ s, info, onRetake, retaking }: { s: Session; info: Info; onRetake: () => void; retaking: boolean }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const r = s.result;
  const score = s.scorePercent ?? 0;
  const attemptsLeft = info.maxAttempts - info.attemptsUsed;
  return (
    <Card className="overflow-hidden">
      <div className={cx("px-6 py-8 text-center", s.passed ? "bg-emerald-50" : "bg-amber-50")}>
        <div className="relative mx-auto h-32 w-32" role="img" aria-label={`Score ${score}%`}>
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={s.passed ? "#10b981" : "#f59e0b"} strokeWidth="10" strokeLinecap="round" strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - score / 100)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="font-display text-3xl font-bold text-ink">{score}%</span><span className="text-xs text-ink-mute">pass {s.passMarkPercent}%</span></div>
        </div>
        <h1 className="mt-4 flex items-center justify-center gap-2 font-display text-2xl font-bold text-ink">
          {s.passed ? <><CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden />Interview passed</> : <><XCircle className="h-6 w-6 text-amber-600" aria-hidden />Not passed this time</>}
        </h1>
        {r?.summary && <p className="mx-auto mt-2 max-w-xl text-ink-soft">{r.summary}</p>}
      </div>

      {r && (
        <div className="space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {r.criteria.map((c) => (
              <div key={c.name} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-baseline justify-between"><span className="font-semibold text-ink">{c.name}</span><span className="font-display text-lg font-bold text-ink">{c.score}<span className="text-sm text-ink-mute">/10</span></span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{ width: `${c.score * 10}%` }} /></div>
                <p className="mt-2 text-[13px] text-ink-mute">{c.comment}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-emerald-50/60 p-5">
              <div className="mb-2 flex items-center gap-2 font-semibold text-emerald-800"><ThumbsUp className="h-4 w-4" aria-hidden />Strengths</div>
              <ul className="space-y-1.5 text-sm text-ink-soft">{r.strengths.map((x) => <li key={x}>• {x}</li>)}</ul>
            </div>
            <div className="rounded-2xl bg-amber-50/60 p-5">
              <div className="mb-2 flex items-center gap-2 font-semibold text-amber-800"><TrendingUp className="h-4 w-4" aria-hidden />To improve</div>
              <ul className="space-y-1.5 text-sm text-ink-soft">{r.improvements.map((x) => <li key={x}>• {x}</li>)}</ul>
            </div>
          </div>
          <div>
            <button onClick={() => setShowTranscript(!showTranscript)} className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink" aria-expanded={showTranscript}>
              <ChevronDown className={cx("h-4 w-4 transition-transform", showTranscript && "rotate-180")} aria-hidden />{showTranscript ? "Hide" : "Show"} transcript
            </button>
            {showTranscript && <div className="mt-3 space-y-3 rounded-2xl bg-slate-50 p-4">{s.transcript.map((t, i) => <Bubble key={i} t={t} name="You" />)}</div>}
          </div>
          {!s.passed && attemptsLeft > 0 && (
            <div className="flex justify-center"><Button size="lg" loading={retaking} onClick={onRetake}><RotateCcw className="h-4 w-4" aria-hidden />Try again ({attemptsLeft} left)</Button></div>
          )}
        </div>
      )}
    </Card>
  );
}
