import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, CheckCircle2, Send, X } from "lucide-react";
import { post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { referral } from "@/lib/format";
import { Button, ErrorNote, cx } from "./ui";

type Field = "name" | "email" | "phone" | "goal" | "preferredTime" | "message";
interface Step { field: Field; ask: (a: Answers) => string; chips?: string[]; skip?: string; type?: string; validate?: (v: string) => string | null }
type Answers = Partial<Record<Field, string>>;
interface Turn { role: "user" | "assistant"; content: string }

const STEPS: Step[] = [
  { field: "name", ask: () => "First, what's your name?" },
  {
    field: "email", type: "email", ask: (a) => `Nice to meet you, ${a.name?.split(" ")[0]}! What's your email, so we can send you the details?`,
    validate: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "That doesn't look like an email address — try again?"),
  },
  {
    field: "phone", type: "tel", skip: "Skip", ask: () => "Can we reach you on a phone or WhatsApp number? (optional)",
    validate: (v) => { const n = v.replace(/\D/g, "").length; return n >= 7 && n <= 15 ? null : "Please enter a valid phone number, or tap Skip."; },
  },
  { field: "goal", ask: () => "What are you hoping to get from this course?", chips: ["Get a job", "Grow in my current role", "Switch careers", "Just exploring"] },
  { field: "preferredTime", ask: () => "When would you prefer to learn?", chips: ["Weekdays", "Evenings", "Weekends", "Flexible / self-paced"] },
  { field: "message", skip: "No, that's all", ask: () => "Anything else you'd like to ask the instructor?" },
];

/**
 * Chat-style "I'm interested" form for a course, opened from a shared course link (?interest=1).
 * Works without an account; for signed-in users the name and email steps are filled in already.
 */
export function CourseInterestChat({ course, onClose }: { course: { id: string; title: string }; onClose: () => void }) {
  const { me } = useAuth();
  const known: Answers = me ? { name: me.fullName, email: me.email } : {};
  const steps = STEPS.filter((s) => !known[s.field]);

  const [answers, setAnswers] = useState<Answers>(known);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Turn[]>(() => [
    { role: "assistant", content: `Hi${me ? ` ${me.fullName.split(" ")[0]}` : ""}! 👋 Great to see you're interested in "${course.title}". I'll ask a few quick questions so the instructor can get in touch.` },
    { role: "assistant", content: steps[0].ask(known) },
  ]);
  const end = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = useMutation({
    mutationFn: (a: Answers) => post<{ isNew: boolean }>(`/courses/${course.id}/interest`, { ...a, source: referral.get() }),
    onSuccess: (r) => setMessages((m) => [...m, {
      role: "assistant",
      content: r.isNew ? "Thanks! 🎉 Your interest is registered — the instructor will contact you soon." : "Thanks! We've updated your details — the instructor will be in touch.",
    }]),
  });

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, submit.isPending]);
  useEffect(() => { inputRef.current?.focus(); }, [step]);

  const current = steps[step] as Step | undefined;
  const finished = !current;

  const answer = (raw: string, skipped = false) => {
    if (!current || submit.isPending) return;
    const value = raw.trim();
    if (!skipped && !value) return;
    const said: Turn = { role: "user", content: skipped ? current.skip! : value };
    const error = !skipped && current.validate?.(value);
    if (error) { setMessages((m) => [...m, said, { role: "assistant", content: error }]); setInput(""); return; }

    const next = { ...answers, [current.field]: skipped ? undefined : value };
    const following = steps[step + 1];
    setAnswers(next);
    setInput("");
    setStep(step + 1);
    setMessages((m) => [...m, said, ...(following ? [{ role: "assistant" as const, content: following.ask(next) }] : [])]);
    if (!following) submit.mutate(next);
  };
  const onSubmit = (e: FormEvent) => { e.preventDefault(); answer(input); };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full max-w-md animate-fade-in flex-col bg-white shadow-pop" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Register your interest">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <Bot className="h-5 w-5 text-brand-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-ink">I'm interested</div>
            <div className="truncate text-xs text-ink-mute">{course.title}</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-mute hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={cx("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm", m.role === "user" ? "ml-auto bg-brand-600 text-white" : "bg-slate-100 text-ink")}>
              {m.content}
            </div>
          ))}
          {submit.isPending && <div className="text-sm text-ink-mute">Sending…</div>}
          {submit.error && (
            <div className="space-y-2">
              <ErrorNote error={submit.error} />
              <Button size="sm" variant="secondary" onClick={() => submit.mutate(answers)}>Try again</Button>
            </div>
          )}
          {current && (current.chips || current.skip) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {current.chips?.map((c) => (
                <button key={c} onClick={() => answer(c)} className="rounded-full border border-brand-200 px-3 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50">{c}</button>
              ))}
              {current.skip && (
                <button onClick={() => answer("", true)} className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-ink-mute hover:bg-slate-50">{current.skip}</button>
              )}
            </div>
          )}
          {submit.isSuccess && (
            <div className="flex justify-center pt-2">
              <Button onClick={onClose}><CheckCircle2 className="h-4 w-4" aria-hidden /> Done</Button>
            </div>
          )}
          <div ref={end} />
        </div>

        {!finished && (
          <form onSubmit={onSubmit} className="flex gap-2 border-t border-slate-200 p-3">
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} type={current?.type ?? "text"} maxLength={current?.field === "message" ? 1000 : 120}
              placeholder="Type your answer…" aria-label="Your answer"
              className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
            <Button type="submit" disabled={!input.trim()} aria-label="Send"><Send className="h-4 w-4" /></Button>
          </form>
        )}
      </div>
    </div>
  );
}
