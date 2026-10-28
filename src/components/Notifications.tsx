import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Bell, Brain, CalendarClock, CheckCheck, ClipboardCheck, Flag, Hand, MessageSquare, Radio, UserPlus, type LucideIcon } from "lucide-react";
import { api, post } from "@/lib/api";
import { relative } from "@/lib/classes";
import { cx } from "./ui";

type Kind = "ClassStartingSoon" | "ClassLive" | "MilestoneDue" | "MilestoneOverdue" | "TestPending" | "InterviewPending" | "Inactive" | "PracticeNudge" | "BadgeEarned" | "CourseInterest";
interface Item { id: string; kind: Kind; title: string; body: string; link?: string; createdAt: string; read: boolean }
interface Inbox { unread: number; items: Item[] }

const META: Record<Kind, { icon: LucideIcon; tone: string }> = {
  ClassStartingSoon: { icon: CalendarClock, tone: "bg-sky-50 text-sky-600" },
  ClassLive: { icon: Radio, tone: "bg-red-50 text-red-600" },
  MilestoneDue: { icon: Flag, tone: "bg-amber-50 text-amber-600" },
  MilestoneOverdue: { icon: Flag, tone: "bg-red-50 text-red-600" },
  TestPending: { icon: ClipboardCheck, tone: "bg-violet-50 text-violet-600" },
  InterviewPending: { icon: MessageSquare, tone: "bg-violet-50 text-violet-600" },
  Inactive: { icon: Hand, tone: "bg-brand-50 text-brand-600" },
  PracticeNudge: { icon: Brain, tone: "bg-indigo-50 text-indigo-600" },
  BadgeEarned: { icon: Award, tone: "bg-yellow-50 text-yellow-600" },
  CourseInterest: { icon: UserPlus, tone: "bg-emerald-50 text-emerald-600" },
};

/** Bell + dropdown inbox for the reminder & follow-up agent. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const inbox = useQuery({ queryKey: ["notifications"], queryFn: () => api<Inbox>("/me/notifications"), refetchInterval: 60_000 });
  const refresh = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  const read = useMutation({ mutationFn: (id: string) => post(`/me/notifications/${id}/read`), onSuccess: refresh });
  const readAll = useMutation({ mutationFn: () => post("/me/notifications/read-all"), onSuccess: refresh });

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const unread = inbox.data?.unread ?? 0;
  const go = (n: Item) => {
    if (!n.read) read.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-ink-soft hover:bg-slate-50"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop" role="dialog" aria-label="Notifications">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <div className="font-display font-bold text-ink">Notifications</div>
              <div className="text-xs text-ink-mute">{unread ? `${unread} unread` : "You're all caught up"}</div>
            </div>
            {unread > 0 && (
              <button onClick={() => readAll.mutate()} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                <CheckCheck className="h-3.5 w-3.5" aria-hidden />Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-[26rem] overflow-y-auto">
            {!inbox.data?.items.length ? (
              <li className="px-4 py-10 text-center text-sm text-ink-mute">No notifications yet. We'll remind you about classes, milestones and tests here.</li>
            ) : inbox.data.items.map((n) => {
              const m = META[n.kind] ?? META.Inactive;
              return (
                <li key={n.id}>
                  <button onClick={() => go(n)} className={cx("flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50", !n.read && "bg-brand-50/40")}>
                    <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", m.tone)}><m.icon className="h-4 w-4" aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={cx("text-sm", n.read ? "font-medium text-ink-soft" : "font-semibold text-ink")}>{n.title}</span>
                        {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-5 text-ink-mute">{n.body}</span>
                      <span className="mt-1 block text-[11px] text-slate-400">{relative(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
