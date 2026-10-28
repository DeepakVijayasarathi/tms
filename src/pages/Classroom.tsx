import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, BookOpen, CalendarDays, CheckCircle2, Clock, Loader2, LogOut, MapPin, PhoneOff, ShieldCheck, User, Users, Video, XCircle,
} from "lucide-react";
import { api, post } from "@/lib/api";
import { canEnter, relative, timeRange, toDate, useNow, type ClassDetail, type JoinInfo } from "@/lib/classes";
import { Button, ErrorNote, LiveBadge, Spinner, StatusBadge } from "@/components/ui";

// Minimal surface of Jitsi's IFrame API (https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe).
interface JitsiApi {
  addListener(event: string, fn: (...args: unknown[]) => void): void;
  executeCommand(command: string, ...args: unknown[]): void;
  getNumberOfParticipants(): number;
  dispose(): void;
}
type JitsiCtor = new (domain: string, options: Record<string, unknown>) => JitsiApi;
declare global {
  interface Window { JitsiMeetExternalAPI?: JitsiCtor }
}

const scriptLoads = new Map<string, Promise<JitsiCtor>>();
function loadJitsi(domain: string): Promise<JitsiCtor> {
  const cached = scriptLoads.get(domain);
  if (cached) return cached;
  const p = new Promise<JitsiCtor>((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve(window.JitsiMeetExternalAPI);
    const s = document.createElement("script");
    s.src = `https://${domain}/external_api.js`;
    s.async = true;
    s.onload = () => (window.JitsiMeetExternalAPI ? resolve(window.JitsiMeetExternalAPI) : reject(new Error("The video service didn't load.")));
    s.onerror = () => { scriptLoads.delete(domain); reject(new Error(`Couldn't reach the video server (${domain}). Check your connection and try again.`)); };
    document.head.appendChild(s);
  });
  scriptLoads.set(domain, p);
  return p;
}

export function Classroom() {
  const { sessionId } = useParams();
  const [join, setJoin] = useState<JoinInfo | null>(null);
  const qc = useQueryClient();
  const detail = useQuery({
    queryKey: ["class", sessionId],
    queryFn: () => api<ClassDetail>(`/sessions/${sessionId}`),
    refetchInterval: join ? false : 30_000,
  });
  const enter = useMutation({
    mutationFn: () => post<JoinInfo>(`/sessions/${sessionId}/join`),
    onSuccess: (j) => { setJoin(j); qc.invalidateQueries({ queryKey: ["my-classes"] }); },
  });

  if (join) {
    return <LiveRoom join={join} startedAt={detail.data?.startedAt} onExit={() => { setJoin(null); qc.invalidateQueries({ queryKey: ["class", sessionId] }); }} />;
  }
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white px-4 sm:px-6">
        <Link to="/classes" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink-soft hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Live classes
        </Link>
        <Link to="/dashboard" className="ml-auto flex items-center gap-2">
          <img src="/logo-icon.png" alt="" className="h-8 w-8 object-contain" />
          <span className="hidden font-display text-lg font-semibold text-ink sm:inline">TMS Learning</span>
        </Link>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-14">
        {detail.isLoading ? <Spinner label="Loading class" /> : !detail.data ? <ErrorNote error={detail.error} /> : (
          <Lobby c={detail.data} onJoin={() => enter.mutate()} joining={enter.isPending} error={enter.error} />
        )}
      </main>
    </div>
  );
}

function Lobby({ c, onJoin, joining, error }: { c: ClassDetail; onJoin: () => void; joining: boolean; error: unknown }) {
  const now = useNow(15_000);
  const qc = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => post(`/sessions/${c.id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["class", c.id] }); qc.invalidateQueries({ queryKey: ["my-classes"] }); },
  });
  // The server re-checks; this only flips the button on time without waiting for the next poll.
  const canJoin = c.canJoin || canEnter(c, now);
  const finished = c.status === "Ended" || c.status === "Cancelled";

  return (
    <div className="grid animate-fade-in gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="relative overflow-hidden rounded-3xl bg-navy p-8 text-white shadow-pop sm:p-10">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 90% 90%, rgb(255 98 3 / .35), transparent 50%), radial-gradient(circle at 0% 0%, rgb(254 150 3 / .18), transparent 45%)" }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.10]" style={{ backgroundImage: "radial-gradient(rgb(255 255 255) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} />
            {c.isHost && <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold"><ShieldCheck className="h-3.5 w-3.5" aria-hidden />Host</span>}
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl">{c.title}</h1>
          <Link to={`/courses/${c.course.slug}`} className="mt-2 inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
            <BookOpen className="h-4 w-4" aria-hidden />{c.course.title}
          </Link>
          {c.description && <p className="mt-5 max-w-xl text-white/80">{c.description}</p>}

          <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
            <Info icon={CalendarDays} label="Date">{toDate(c.startsAt).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</Info>
            <Info icon={Clock} label="Time">{timeRange(c.startsAt, c.endsAt)}</Info>
            {c.instructor && <Info icon={User} label="Instructor">{c.instructor}</Info>}
            <Info icon={c.location ? MapPin : Video} label={c.location ? "Location" : "Where"}>{c.location ?? "Online · built-in classroom"}</Info>
          </dl>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-card sm:p-8">
          {finished ? (
            <div className="text-center">
              <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${c.status === "Ended" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                {c.status === "Ended" ? <CheckCircle2 className="h-7 w-7" aria-hidden /> : <XCircle className="h-7 w-7" aria-hidden />}
              </span>
              <h2 className="mt-4 font-display text-2xl font-semibold text-ink">{c.status === "Ended" ? "This class has ended" : "This class was cancelled"}</h2>
              {c.status === "Ended" && !c.isHost && (
                <p className="mt-2 text-sm text-ink-mute">
                  {c.myStatus === "Present" ? "You attended — it counts towards your certificate." : "You didn't join this class."}
                </p>
              )}
              {c.isHost && c.status === "Ended" && <p className="mt-2 text-sm text-ink-mute">{c.present} of {c.registered} learners attended.</p>}
            </div>
          ) : (
            <div className="text-center">
              <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${c.status === "Live" ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-600"}`}>
                <Video className="h-7 w-7" aria-hidden />
              </span>
              <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
                {c.status === "Live" ? (c.isHost ? "Your class is live" : "Class is in progress") : canJoin ? (c.isHost ? "Ready when you are" : "The classroom is open") : `Starts ${relative(c.startsAt, now)}`}
              </h2>
              <p className="mt-2 text-sm text-ink-mute">
                {canJoin
                  ? c.isHost ? "Starting the class lets learners see you're live. You join as the moderator." : "Joining marks you present. Allow camera and microphone access when your browser asks."
                  : c.isHost ? `You can start up to an hour early — from ${toDate(c.joinOpensAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.`
                    : `The classroom opens at ${toDate(c.joinOpensAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}, 15 minutes before the start.`}
              </p>
              <Button size="lg" className={`mt-6 w-full ${c.status === "Live" ? "!bg-none !bg-red-600 hover:!bg-red-700" : ""}`} disabled={!canJoin} loading={joining} onClick={onJoin}>
                <Video className="h-4 w-4" aria-hidden />
                {c.isHost ? (c.status === "Live" ? "Rejoin as host" : "Start class") : "Join class"}
              </Button>
              <div className="mt-3"><ErrorNote error={error} /></div>
              {c.isHost && c.status === "Scheduled" && (
                <button
                  className="mt-3 text-sm font-semibold text-red-700 hover:underline disabled:opacity-50"
                  disabled={cancel.isPending}
                  onClick={() => { if (confirm("Cancel this class? Learners will see it as cancelled.")) cancel.mutate(); }}
                >
                  Cancel this class
                </button>
              )}
              <ErrorNote error={cancel.error} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card">
            <Users className="h-5 w-5 text-brand-600" aria-hidden />
            <div className="mt-2 text-2xl font-bold tabular-nums text-ink">{c.status === "Scheduled" ? c.registered : c.present}</div>
            <div className="text-xs font-medium text-ink-mute">{c.status === "Scheduled" ? "Registered" : "Attended"} · {c.capacity} seats</div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
            <div className="mt-2 text-sm font-semibold text-ink">{c.isHost ? "Auto attendance" : c.myStatus ?? "Not joined yet"}</div>
            <div className="text-xs font-medium text-ink-mute">{c.isHost ? "Learners are marked present on join" : "Your attendance"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10"><Icon className="h-4 w-4 text-brand-300" aria-hidden /></span>
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-white/50">{label}</dt><dd className="font-medium">{children}</dd></div>
    </div>
  );
}

function LiveRoom({ join, startedAt, onExit }: { join: JoinInfo; startedAt?: string; onExit: () => void }) {
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const [status, setStatus] = useState<"loading" | "joined" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [participants, setParticipants] = useState(1);
  const [since] = useState(() => (startedAt ? toDate(startedAt).getTime() : Date.now()));
  const now = useNow(1000);
  const end = useMutation({ mutationFn: () => post(`/sessions/${join.sessionId}/end`) });

  const leave = useCallback(async (opts: { ended?: boolean } = {}) => {
    if (!opts.ended && !join.isHost) await post(`/sessions/${join.sessionId}/leave`).catch(() => undefined);
    apiRef.current?.dispose();
    apiRef.current = null;
    onExit();
  }, [join, onExit]);
  // Jitsi is created once per join; the latest leave handler is read through a ref so a parent
  // re-render (new onExit identity) doesn't tear down and rebuild the call.
  const leaveRef = useRef(leave);
  leaveRef.current = leave;

  useEffect(() => {
    let disposed = false;
    loadJitsi(join.domain).then((Jitsi) => {
      if (disposed || !container.current) return;
      const jitsi = new Jitsi(join.domain, {
        roomName: join.room,
        jwt: join.token ?? undefined,
        parentNode: container.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName: join.displayName, email: join.email },
        configOverwrite: {
          subject: join.title,
          prejoinConfig: { enabled: false },
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          startWithAudioMuted: !join.isHost,
          enableWelcomePage: false,
          disableInviteFunctions: true,
        },
        interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false, MOBILE_APP_PROMO: false, SHOW_CHROME_EXTENSION_BANNER: false },
      });
      apiRef.current = jitsi;
      const count = () => setParticipants(Math.max(1, jitsi.getNumberOfParticipants()));
      jitsi.addListener("videoConferenceJoined", () => { setStatus("joined"); count(); });
      jitsi.addListener("participantJoined", count);
      jitsi.addListener("participantLeft", count);
      jitsi.addListener("readyToClose", () => void leaveRef.current());
    }).catch((e: Error) => { setStatus("error"); setLoadError(e.message); });
    return () => { disposed = true; apiRef.current?.dispose(); apiRef.current = null; };
  }, [join]);

  const endForAll = async () => {
    if (!confirm("End the class for everyone? Learners who registered but didn't join are marked absent.")) return;
    await end.mutateAsync().catch(() => undefined);
    try { apiRef.current?.executeCommand("endConference"); } catch { /* older Jitsi: hang up below */ }
    await leave({ ended: true });
  };

  const elapsed = Math.max(0, Math.floor((now - since) / 1000));
  const hhmmss = [Math.floor(elapsed / 3600), Math.floor((elapsed % 3600) / 60), elapsed % 60].map((n) => String(n).padStart(2, "0")).join(":");

  return (
    <div className="fixed inset-0 flex flex-col bg-navy-900 text-white">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-navy px-3 sm:px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white p-1"><img src="/logo-icon.png" alt="" className="h-full w-full object-contain" /></span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{join.title}</div>
          <div className="truncate text-xs text-white/50">{join.course.title}</div>
        </div>
        <div className="ml-2 hidden items-center gap-3 md:flex">
          <LiveBadge />
          <span className="font-mono text-sm tabular-nums text-white/80" aria-label="Elapsed time">{hhmmss}</span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold"><Users className="h-3.5 w-3.5" aria-hidden />{participants}</span>
          {join.isHost && <span className="flex items-center gap-1 rounded-full bg-brand-500/20 px-2.5 py-1 text-xs font-semibold text-brand-300"><ShieldCheck className="h-3.5 w-3.5" aria-hidden />Host</span>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => void leave()} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/20">
            <LogOut className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Leave</span>
          </button>
          {join.isHost && (
            <button onClick={endForAll} disabled={end.isPending} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold transition-colors hover:bg-red-700 disabled:opacity-60">
              <PhoneOff className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">End class</span>
            </button>
          )}
        </div>
      </header>

      <div className="relative flex-1">
        <div ref={container} className="absolute inset-0" />
        {status === "loading" && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
            <Loader2 className="h-8 w-8 animate-spin text-brand-400" aria-hidden />
            Connecting to the classroom…
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="max-w-md text-white/80">{loadError}</p>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()}>Try again</Button>
              <Button variant="secondary" onClick={() => navigate("/classes")}>Back to classes</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
