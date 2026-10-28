import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { api, post } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Spinner, cx } from "@/components/ui";

interface AttemptView {
  id: string;
  status: "InProgress" | "Submitted";
  expiresAt?: string;
  title: string;
  passMarkPercent: number;
  questions: { id: string; prompt: string; kind: "SingleChoice" | "MultipleChoice" | "TrueFalse"; points: number; options: { id: string; text: string }[] }[];
}
interface Result {
  title: string;
  scorePoints: number;
  maxPoints: number;
  scorePercent: number;
  passed: boolean;
  passMarkPercent: number;
  attemptsUsed: number;
  maxAttempts: number;
  answerKeyReleased: boolean;
  questions: { id: string; prompt: string; correct: boolean; selected: string[]; options: { id: string; text: string; isCorrect?: boolean | null }[]; explanation?: string }[];
}

export function Attempt() {
  const { attemptId } = useParams();
  const attempt = useQuery({ queryKey: ["attempt", attemptId], queryFn: () => api<AttemptView>(`/attempts/${attemptId}`) });
  if (attempt.isLoading) return <Spinner />;
  if (!attempt.data) return <ErrorNote error={attempt.error} />;
  return attempt.data.status === "Submitted" ? <ResultView attemptId={attemptId!} /> : <TakeView attempt={attempt.data} />;
}

function useCountdown(expiresAt?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return null;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
}

function TakeView({ attempt }: { attempt: AttemptView }) {
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const left = useCountdown(attempt.expiresAt);

  const submit = useMutation({
    mutationFn: () => post(`/attempts/${attempt.id}/submit`, {
      answers: attempt.questions.map((q) => ({ questionId: q.id, optionIds: answers[q.id] ?? [] })),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attempt", attempt.id] }),
  });

  useEffect(() => {
    if (left === 0 && !submit.isPending && !submit.isSuccess) submit.mutate();
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (qid: string, oid: string, multi: boolean) =>
    setAnswers((a) => {
      const cur = a[qid] ?? [];
      return { ...a, [qid]: multi ? (cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid]) : [oid] };
    });
  const answered = attempt.questions.filter((q) => (answers[q.id] ?? []).length > 0).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="sticky top-16 z-10 -mx-4 mb-6 flex items-center justify-between border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="font-semibold">{attempt.title}</h1>
          <p className="text-sm text-ink-mute">{answered}/{attempt.questions.length} answered · pass at {attempt.passMarkPercent}%</p>
        </div>
        {left !== null && (
          <span className={cx("flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm tabular-nums", left < 60 ? "bg-red-50 text-red-700" : "bg-white text-ink")}>
            <Clock className="h-4 w-4" aria-hidden />{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {attempt.questions.map((q, i) => {
          const multi = q.kind === "MultipleChoice";
          return (
            <Card key={q.id} className="p-5">
              <fieldset>
                <legend className="mb-3 font-medium text-ink">
                  <span className="mr-2 text-ink-mute">{i + 1}.</span>{q.prompt}
                  {multi && <span className="ml-2 text-xs font-normal text-ink-mute">(select all that apply)</span>}
                </legend>
                <div className="space-y-2">
                  {q.options.map((o) => {
                    const checked = (answers[q.id] ?? []).includes(o.id);
                    return (
                      <label key={o.id} className={cx("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm", checked ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50")}>
                        <input type={multi ? "checkbox" : "radio"} name={q.id} checked={checked} onChange={() => toggle(q.id, o.id, multi)} />
                        {o.text}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </Card>
          );
        })}
      </div>
      <div className="mt-6 flex items-center gap-3">
        <Button className="py-2.5" loading={submit.isPending} onClick={() => submit.mutate()}>Submit answers</Button>
        {answered < attempt.questions.length && <span className="text-sm text-ink-mute">{attempt.questions.length - answered} unanswered</span>}
      </div>
      <div className="mt-3"><ErrorNote error={submit.error} /></div>
    </div>
  );
}

function ResultView({ attemptId }: { attemptId: string }) {
  const result = useQuery({ queryKey: ["result", attemptId], queryFn: () => api<Result>(`/attempts/${attemptId}/result`) });
  const enrollments = useQuery({ queryKey: ["enrollments"], queryFn: () => api<{ id: string; course: { title: string } }[]>("/me/enrollments") });
  if (result.isLoading) return <Spinner />;
  if (!result.data) return <ErrorNote error={result.error} />;
  const r = result.data;
  const back = enrollments.data?.[0];

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="p-6 text-center">
        {r.passed ? <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden /> : <XCircle className="mx-auto h-12 w-12 text-red-500" aria-hidden />}
        <h1 className="mt-3 font-display text-4xl font-semibold">{r.scorePercent}%</h1>
        <p className="text-ink-mute">{r.passed ? "Passed" : `Not passed — ${r.passMarkPercent}% needed`} · {r.scorePoints}/{r.maxPoints} points · attempt {r.attemptsUsed} of {r.maxAttempts}</p>
        {back && <Link to="/learn" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">Back to my learning</Link>}
      </Card>
      {!r.answerKeyReleased && (
        <p className="mt-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-ink-soft">Correct answers are shown once you pass or use all your attempts.</p>
      )}
      <div className="mt-6 space-y-3">
        {r.questions.map((q, i) => (
          <Card key={q.id} className="p-5">
            <div className="flex items-start gap-2">
              {q.correct ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-label="Correct" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-label="Incorrect" />}
              <p className="font-medium">{i + 1}. {q.prompt}</p>
            </div>
            <ul className="mt-3 space-y-1 pl-7 text-sm">
              {q.options.map((o) => (
                <li key={o.id} className="flex items-center gap-2">
                  <span className={cx(q.selected.includes(o.id) && "font-medium")}>{o.text}</span>
                  {q.selected.includes(o.id) && <Badge>your answer</Badge>}
                  {o.isCorrect && <Badge tone="green">correct</Badge>}
                </li>
              ))}
            </ul>
            {q.explanation && <p className="mt-3 pl-7 text-sm text-ink-mute">{q.explanation}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
