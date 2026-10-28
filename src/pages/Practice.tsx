import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Brain, Check, Crown, Flame, RotateCcw, Sparkles, Target, TrendingDown, TrendingUp, Trophy, X, Zap } from "lucide-react";
import { api, post } from "@/lib/api";
import { Medal } from "@/components/Badges";
import { Button, Card, ErrorNote, Spinner, cx } from "@/components/ui";
import type { Tier } from "@/lib/gamification";

type Difficulty = "Easy" | "Medium" | "Hard";
interface Round { id: string; difficulty: Difficulty; source: "gemini" | "bank"; total: number; questions: { prompt: string; options: string[]; lesson: string }[] }
interface Feedback { correct: boolean; correctIndex: number; explanation: string; points: number; combo: number; xpEarned: number }
interface Result {
  correct: number; total: number; answered: number; bestCombo: number; xpEarned: number; difficulty: Difficulty; perfect: boolean;
  nextDifficulty: "up" | "down" | "same"; totalXp: number; level: { number: number; title: string }; leveledUp: boolean;
  newBadges: { key: string; name: string; description: string; icon: string; tier: Tier }[];
}
interface History { id: string; difficulty: Difficulty; correct: number; total: number; bestCombo: number; xpEarned: number; submittedAt: string }

const DIFF_STYLE: Record<Difficulty, string> = { Easy: "bg-emerald-50 text-emerald-700 ring-emerald-200", Medium: "bg-amber-50 text-amber-700 ring-amber-200", Hard: "bg-red-50 text-red-700 ring-red-200" };
const LETTERS = ["A", "B", "C", "D"];

export function Practice() {
  const { enrollmentId } = useParams();
  const qc = useQueryClient();
  const course = useQuery({ queryKey: ["player", enrollmentId], queryFn: () => api<{ course: { title: string; slug: string } }>(`/enrollments/${enrollmentId}`) });
  const history = useQuery({ queryKey: ["practice-history", enrollmentId], queryFn: () => api<History[]>(`/practice/${enrollmentId}/history`) });
  const [round, setRound] = useState<Round | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [xp, setXp] = useState(0);
  const [combo, setCombo] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [result, setResult] = useState<Result | null>(null);

  const start = useMutation({
    mutationFn: () => post<Round>(`/practice/${enrollmentId}/rounds`),
    onSuccess: (r) => { setRound(r); setIndex(0); setPicked(null); setFeedback(null); setXp(0); setCombo(0); setResults([]); setResult(null); },
  });
  const answer = useMutation({
    mutationFn: (option: number) => post<Feedback>(`/practice/rounds/${round!.id}/answers`, { index, option }),
    onSuccess: (f) => { setFeedback(f); setXp(f.xpEarned); setCombo(f.combo); setResults((r) => [...r, f.correct]); },
  });
  const finish = useMutation({
    mutationFn: () => post<Result>(`/practice/rounds/${round!.id}/finish`),
    onSuccess: (r) => { setResult(r); qc.invalidateQueries({ queryKey: ["progress"] }); qc.invalidateQueries({ queryKey: ["practice-history", enrollmentId] }); },
  });

  const choose = (i: number) => { if (picked !== null || answer.isPending) return; setPicked(i); answer.mutate(i); };
  const next = () => {
    if (!round) return;
    if (index + 1 >= round.total) finish.mutate();
    else { setIndex(index + 1); setPicked(null); setFeedback(null); }
  };

  const back = (
    <Link to={`/learn/${enrollmentId}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-mute hover:text-ink">
      <ArrowLeft className="h-4 w-4" aria-hidden />{course.data?.course.title ?? "Back to course"}
    </Link>
  );

  // Results
  if (result) {
    const pct = Math.round((result.correct / Math.max(1, result.total)) * 100);
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {back}
        <Card className="overflow-hidden">
          <div className="relative bg-navy px-6 py-10 text-center text-white">
            <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 50% 120%, rgb(255 122 3 / .55), transparent 60%)" }} />
            <div className="relative">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">{result.perfect ? <Trophy className="h-8 w-8 text-yellow-300" aria-hidden /> : <Target className="h-8 w-8 text-brand-300" aria-hidden />}</span>
              <h1 className="mt-4 font-display text-3xl font-bold">{result.perfect ? "Perfect round!" : pct >= 60 ? "Nice work!" : "Keep practising"}</h1>
              <p className="mt-1 text-white/70">{result.correct} of {result.total} correct · {result.difficulty} round</p>
              <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
                <ResultStat icon={Zap} label="XP earned" value={`+${result.xpEarned}`} />
                <ResultStat icon={Flame} label="Best combo" value={`×${result.bestCombo}`} />
                <ResultStat icon={Target} label="Accuracy" value={`${pct}%`} />
              </div>
            </div>
          </div>
          <div className="space-y-4 p-6">
            {result.leveledUp && (
              <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
                <Crown className="h-6 w-6 text-brand-600" aria-hidden />
                <div><div className="font-semibold text-ink">Level up! You're now level {result.level.number}</div><div className="text-sm text-ink-soft">{result.level.title}</div></div>
              </div>
            )}
            {result.newBadges.length > 0 && (
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Sparkles className="h-4 w-4 text-brand-500" aria-hidden />New badge{result.newBadges.length > 1 ? "s" : ""} unlocked</div>
                <div className="flex flex-wrap gap-4">
                  {result.newBadges.map((b) => (
                    <div key={b.key} className="flex items-center gap-3"><Medal badge={{ ...b, earned: true }} size="md" /><div><div className="font-semibold text-ink">{b.name}</div><div className="text-xs text-ink-mute">{b.description}</div></div></div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-ink-soft">
              {result.nextDifficulty === "up" ? <TrendingUp className="h-5 w-5 text-emerald-600" aria-hidden /> : result.nextDifficulty === "down" ? <TrendingDown className="h-5 w-5 text-amber-600" aria-hidden /> : <Target className="h-5 w-5 text-ink-mute" aria-hidden />}
              {result.nextDifficulty === "up" ? "Great accuracy — the next round will be harder." : result.nextDifficulty === "down" ? "The next round will be a little easier to rebuild confidence." : "The next round stays at the same level."}
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button size="lg" loading={start.isPending} onClick={() => start.mutate()}><RotateCcw className="h-4 w-4" aria-hidden />Play another round</Button>
              <Link to="/progress" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-5 text-[15px] font-semibold text-ink hover:bg-slate-50"><Trophy className="h-4 w-4" aria-hidden />View progress</Link>
            </div>
            <ErrorNote error={start.error} />
          </div>
        </Card>
      </div>
    );
  }

  // Playing
  if (round) {
    const q = round.questions[index]!;
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {back}
          <div className="flex items-center gap-2">
            <span className={cx("rounded-full px-3 py-1 text-xs font-bold ring-1", DIFF_STYLE[round.difficulty])}>{round.difficulty}</span>
            {combo >= 2 && <span className="flex animate-fade-in items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700"><Flame className="h-3.5 w-3.5" aria-hidden />Combo ×{combo}</span>}
            <span className="flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white"><Zap className="h-3.5 w-3.5" aria-hidden />{xp} XP</span>
          </div>
        </div>

        <div className="flex gap-1.5" aria-label={`Question ${index + 1} of ${round.total}`}>
          {round.questions.map((_, i) => (
            <span key={i} className={cx("h-2 flex-1 rounded-full transition-colors", i < results.length ? (results[i] ? "bg-emerald-500" : "bg-red-400") : i === index ? "bg-brand-400" : "bg-slate-200")} />
          ))}
        </div>

        <Card className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-ink-mute">
            <span>Question {index + 1} of {round.total}</span>
            <span className="truncate normal-case tracking-normal">{q.lesson}</span>
          </div>
          <h2 className="mt-3 font-display text-xl font-bold leading-snug text-ink sm:text-2xl">{q.prompt}</h2>
          <div className="mt-6 grid gap-3">
            {q.options.map((o, i) => {
              const isPicked = picked === i;
              const isRight = feedback && feedback.correctIndex === i;
              const isWrong = feedback && isPicked && !feedback.correct;
              return (
                <button
                  key={i}
                  onClick={() => choose(i)}
                  disabled={picked !== null}
                  className={cx(
                    "flex items-center gap-4 rounded-2xl border-2 px-4 py-3.5 text-left text-[15px] font-medium transition-all",
                    !feedback && !isPicked && "border-slate-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/40 hover:shadow-sm",
                    !feedback && isPicked && "border-brand-400 bg-brand-50",
                    isRight && "border-emerald-500 bg-emerald-50 text-emerald-900",
                    isWrong && "border-red-400 bg-red-50 text-red-900",
                    feedback && !isRight && !isWrong && "border-slate-200 opacity-60",
                  )}
                >
                  <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                    isRight ? "bg-emerald-500 text-white" : isWrong ? "bg-red-500 text-white" : "bg-slate-100 text-ink-soft")}>
                    {isRight ? <Check className="h-4 w-4" aria-hidden /> : isWrong ? <X className="h-4 w-4" aria-hidden /> : LETTERS[i]}
                  </span>
                  <span className="flex-1">{o}</span>
                </button>
              );
            })}
          </div>

          <ErrorNote error={answer.error ?? finish.error} />
          {feedback && (
            <div className={cx("mt-6 animate-slide-up rounded-2xl p-4", feedback.correct ? "bg-emerald-50" : "bg-red-50")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={cx("flex items-center gap-2 font-bold", feedback.correct ? "text-emerald-700" : "text-red-700")}>
                  {feedback.correct ? <><Check className="h-5 w-5" aria-hidden />Correct!</> : <><X className="h-5 w-5" aria-hidden />Not quite</>}
                </span>
                {feedback.points > 0 && <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-brand-700 shadow-sm">+{feedback.points} XP{feedback.combo >= 3 ? " · combo bonus" : ""}</span>}
              </div>
              {feedback.explanation && <p className="mt-2 text-sm text-ink-soft">{feedback.explanation}</p>}
              <div className="mt-4 flex justify-end">
                <Button onClick={next} loading={finish.isPending}>{index + 1 >= round.total ? "See results" : "Next question"}<ArrowRight className="h-4 w-4" aria-hidden /></Button>
              </div>
            </div>
          )}
        </Card>
        <p className="text-center text-xs text-ink-mute">{round.source === "gemini" ? "✦ Questions generated by Gemini from this course's lessons" : "Questions from this course's question bank"} · practice doesn't affect your grades</p>
      </div>
    );
  }

  // Intro
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {back}
      <Card className="overflow-hidden">
        <div className="relative bg-navy px-6 py-10 text-white sm:px-10">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 100% 100%, rgb(255 122 3 / .5), transparent 50%), radial-gradient(circle at 0% 0%, rgb(124 58 237 / .25), transparent 45%)" }} />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-300"><Brain className="h-3.5 w-3.5" aria-hidden />AI practice arena</span>
            <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Test yourself, earn XP</h1>
            <p className="mt-2 max-w-xl text-white/75">Five questions written by AI from {course.data ? <span className="font-semibold text-white">{course.data.course.title}</span> : "this course"}. Instant feedback, combo bonuses — and the difficulty adapts to you.</p>
            <Button size="lg" className="mt-6" loading={start.isPending} onClick={() => start.mutate()}><Sparkles className="h-4 w-4" aria-hidden />{start.isPending ? "Generating questions…" : "Start a round"}</Button>
            <div className="mt-3"><ErrorNote error={start.error} /></div>
          </div>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-3">
          <Rule icon={Zap} title="10–20 XP per answer" text="Harder rounds pay more." />
          <Rule icon={Flame} title="Combo bonus" text="+5 XP from 3 correct in a row." />
          <Rule icon={Trophy} title="Perfect round" text="+25 XP and a Sharpshooter badge." />
        </div>
      </Card>

      <Card>
        <div className="px-5 pb-2 pt-5 font-display text-[17px] font-bold text-ink">Recent rounds</div>
        {history.isLoading ? <Spinner /> : !history.data?.length ? <p className="px-5 pb-5 text-sm text-ink-mute">No rounds yet — your first one starts at Easy.</p> : (
          <ul className="divide-y divide-slate-100">
            {history.data.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className={cx("rounded-full px-2.5 py-0.5 text-xs font-bold ring-1", DIFF_STYLE[h.difficulty])}>{h.difficulty}</span>
                <span className="flex-1 text-ink-soft">{h.correct}/{h.total} correct · best combo ×{h.bestCombo}</span>
                <span className="text-xs text-ink-mute">{new Date(h.submittedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">+{h.xpEarned} XP</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ResultStat({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-3">
      <Icon className="mx-auto h-5 w-5 text-brand-300" aria-hidden />
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-white/60">{label}</div>
    </div>
  );
}

function Rule({ icon: Icon, title, text }: { icon: typeof Zap; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" aria-hidden /></span>
      <div><div className="font-semibold text-ink">{title}</div><div className="text-sm text-ink-mute">{text}</div></div>
    </div>
  );
}
