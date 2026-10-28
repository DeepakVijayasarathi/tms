import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Check, MessageCircle, RefreshCw, Rocket, Sparkles, X } from "lucide-react";
import { api, put } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, CardHeader, Empty, ErrorNote, IconTile, cx } from "./ui";
import { InterestChat } from "./InterestChat";

export const INTEREST_OPTIONS = [
  "Forward Deployed Engineering", "Software Engineering", "Data & Analytics", "AI & Machine Learning", "Cloud & DevOps",
  "Customer Success", "Communication", "Product Management", "Leadership", "Sales Engineering",
];

interface Recommendation { type: "course" | "path"; id: string; slug: string; title: string; subtitle: string; reason: string }
interface RecommendationSet { summary: string; source: "gemini" | "rules"; items: Recommendation[] }

/** Chip picker for the learner's interests, shown in a dialog. */
export function InterestPicker({ onClose }: { onClose: () => void }) {
  const { me } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>(me?.interests ?? []);
  const [custom, setCustom] = useState("");
  const save = useMutation({
    mutationFn: () => put("/me/interests", { interests: selected }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["me"] }); await qc.invalidateQueries({ queryKey: ["recommendations"] }); onClose(); },
  });
  const toggle = (i: string) => setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  const options = [...new Set([...INTEREST_OPTIONS, ...selected])];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Your interests" onClick={onClose}>
      <div className="w-full max-w-lg animate-fade-in rounded-3xl bg-white p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">What are you interested in?</h2>
            <p className="mt-1 text-sm text-ink-mute">We'll recommend courses and Meet to Career paths that fit.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-mute hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {options.map((i) => {
            const on = selected.includes(i);
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                aria-pressed={on}
                className={cx("flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors", on ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200 text-ink-soft hover:border-brand-300 hover:bg-brand-50")}
              >
                {on && <Check className="h-3.5 w-3.5" aria-hidden />}{i}
              </button>
            );
          })}
        </div>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = custom.trim(); if (v && !selected.includes(v)) setSelected([...selected, v]); setCustom(""); }}>
          <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add your own…" maxLength={60} className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" aria-label="Add an interest" />
          <Button type="submit" variant="secondary" disabled={!custom.trim()}>Add</Button>
        </form>
        <div className="mt-6 flex items-center justify-end gap-2">
          <ErrorNote error={save.error} />
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>Save interests</Button>
        </div>
      </div>
    </div>
  );
}

/** Link that opens the interest chat on the dashboard, e.g. after registration: /dashboard?interests=chat */
export const INTEREST_CHAT_LINK = "/dashboard?interests=chat";

/** "Recommended for you" — Gemini picks from the catalog, with interest matching as the fallback. */
export function RecommendationsCard() {
  const { me } = useAuth();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [chatting, setChatting] = useState(() => params.get("interests") === "chat");
  const closeChat = () => {
    setChatting(false);
    if (params.has("interests")) { params.delete("interests"); setParams(params, { replace: true }); }
  };
  const recs = useQuery({ queryKey: ["recommendations"], queryFn: () => api<RecommendationSet>("/me/recommendations"), staleTime: 5 * 60_000, enabled: !!me });
  const interests = me?.interests ?? [];

  return (
    <Card>
      <CardHeader
        icon={Sparkles}
        title="Recommended for you"
        subtitle={recs.data?.summary ?? "Based on your interests and progress"}
        action={
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => recs.refetch()} disabled={recs.isFetching} aria-label="Refresh recommendations"><RefreshCw className={cx("h-4 w-4", recs.isFetching && "animate-spin")} /></Button>
            <Button size="sm" variant="secondary" onClick={() => setChatting(true)}><MessageCircle className="h-4 w-4" aria-hidden /> Chat</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>{interests.length ? "Edit interests" : "Add interests"}</Button>
          </div>
        }
      />
      {interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-5 pb-3">
          {interests.map((i) => <span key={i} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">{i}</span>)}
        </div>
      )}
      <div className="px-5 pb-5">
        <ErrorNote error={recs.error} />
        {recs.isLoading ? <p className="py-6 text-center text-sm text-ink-mute">Finding the best next steps…</p> : !recs.data?.items.length ? (
          <Empty icon={Sparkles} title={interests.length ? "Nothing new to recommend" : "Tell us what you're into"}>
            {!interests.length && (
              <span className="flex flex-wrap justify-center gap-x-3">
                <button className="font-semibold text-brand-700 hover:underline" onClick={() => setChatting(true)}>Chat with our guide</button>
                <span className="text-ink-mute">or</span>
                <button className="font-semibold text-brand-700 hover:underline" onClick={() => setEditing(true)}>pick them yourself</button>
              </span>
            )}
          </Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {recs.data.items.map((r) => (
              <Link key={r.id} to={r.type === "path" ? `/careers/${r.slug}` : `/courses/${r.slug}`} className="flex gap-3 rounded-2xl border border-slate-200 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40">
                <IconTile icon={r.type === "path" ? Rocket : BookOpen} tone={r.type === "path" ? "brand" : "violet"} />
                <div className="min-w-0">
                  <div className="font-semibold text-ink">{r.title}</div>
                  <div className="text-xs font-medium text-ink-mute">{r.subtitle}</div>
                  <p className="mt-1 text-sm text-ink-soft">{r.reason}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
        {recs.data && <p className="mt-3 text-right text-[11px] text-ink-mute">{recs.data.source === "gemini" ? "✦ Personalised by Gemini" : "Matched on your interests"}</p>}
      </div>
      {editing && <InterestPicker onClose={() => setEditing(false)} />}
      {chatting && <InterestChat onClose={closeChat} />}
    </Card>
  );
}
