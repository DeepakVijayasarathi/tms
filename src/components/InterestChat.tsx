import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Check, Send, X } from "lucide-react";
import { post, put } from "@/lib/api";
import { Button, ErrorNote, cx } from "./ui";

interface Turn { role: "user" | "assistant"; content: string }
interface ChatReply { reply: string; suggestions: string[]; interests: string[]; done: boolean; source: "ai" | "rules" }

/** Chat-based interest discovery: a guide asks a few questions, then the learner reviews and saves what it found. */
export function InterestChat({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Turn[]>([]);
  const [last, setLast] = useState<ChatReply | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const end = useRef<HTMLDivElement>(null);

  const [greetError, setGreetError] = useState<unknown>(null);
  const apply = (r: ChatReply) => {
    setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
    setLast(r);
    setSelected(r.interests);
  };
  const send = useMutation({
    mutationFn: (history: Turn[]) => post<ChatReply>("/me/interests/chat", { messages: history }),
    onSuccess: apply,
  });
  const save = useMutation({
    mutationFn: () => put("/me/interests", { interests: selected }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["me"] }); await qc.invalidateQueries({ queryKey: ["recommendations"] }); onClose(); },
  });

  // Fetch the greeting on open. A plain request rather than the mutation: under StrictMode's
  // mount → unmount → mount, a mutation started on mount stays "pending" forever.
  useEffect(() => {
    let live = true;
    post<ChatReply>("/me/interests/chat", { messages: [] }).then((r) => live && apply(r), (e) => live && setGreetError(e));
    return () => { live = false; };
  }, []);
  const greeting = messages.length === 0 && !greetError;
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, send.isPending]);

  const say = (text: string) => {
    const t = text.trim();
    if (!t || send.isPending) return;
    const next: Turn[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setInput("");
    send.mutate(next);
  };
  const submit = (e: FormEvent) => { e.preventDefault(); say(input); };
  const toggle = (i: string) => setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  const found = last?.interests ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full max-w-md animate-fade-in flex-col bg-white shadow-pop" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Find your interests">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <Bot className="h-5 w-5 text-brand-600" aria-hidden />
          <div className="flex-1">
            <div className="font-semibold text-ink">Find your interests</div>
            <div className="text-xs text-ink-mute">A few quick questions to personalise your recommendations</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-mute hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={cx("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm", m.role === "user" ? "ml-auto bg-brand-600 text-white" : "bg-slate-100 text-ink")}>
              {m.content}
            </div>
          ))}
          {(send.isPending || greeting) && <div className="text-sm text-ink-mute">Typing…</div>}
          <ErrorNote error={send.error ?? greetError} />
          {!send.isPending && last && last.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {last.suggestions.map((s) => (
                <button key={s} onClick={() => say(s)} className="rounded-full border border-brand-200 px-3 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50">{s}</button>
              ))}
            </div>
          )}
          <div ref={end} />
        </div>

        {found.length > 0 && (
          <div className="border-t border-slate-200 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-mute">{last?.done ? "Save these interests?" : "So far"}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {found.map((i) => {
                const on = selected.includes(i);
                return (
                  <button key={i} onClick={() => toggle(i)} aria-pressed={on}
                    className={cx("flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors", on ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200 text-ink-soft")}>
                    {on && <Check className="h-3 w-3" aria-hidden />}{i}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <ErrorNote error={save.error} />
              <Button size="sm" variant={last?.done ? "primary" : "secondary"} loading={save.isPending} disabled={!selected.length} onClick={() => save.mutate()}>Save interests</Button>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="flex gap-2 border-t border-slate-200 p-3">
          <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000} placeholder="Type your answer…" aria-label="Your answer"
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
          <Button type="submit" disabled={!input.trim() || send.isPending} aria-label="Send"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  );
}
