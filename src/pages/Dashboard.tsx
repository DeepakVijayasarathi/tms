import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Award, BookOpen, CalendarClock, CalendarDays, Clock, GraduationCap, Rocket, Users, Video } from "lucide-react";
import { RecommendationsCard } from "@/components/Interests";
import { Medal } from "@/components/Badges";
import { levelPercent, useProgress } from "@/lib/gamification";
import { Brain, Flame, Trophy, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canEnter, toDate, useMyClasses, useNow } from "@/lib/classes";
import { ClassAction, ClassRow } from "@/components/ClassCard";
import { portalName } from "@/components/Layout";
import { Card, CardHeader, DotBadge, Empty, IconTile, PageHeader, Progress, Stat } from "@/components/ui";

interface Enrollment { id: string; status: string; course: { id: string; slug: string; title: string; instructor: string }; lessonsTotal: number; lessonsCompleted: number; certificateCode?: string }
interface Cert { id: string }

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function Dashboard() {
  const { me, can } = useAuth();
  const now = useNow();
  const enrollments = useQuery({ queryKey: ["enrollments"], queryFn: () => api<Enrollment[]>("/me/enrollments") });
  const certs = useQuery({ queryKey: ["certificates"], queryFn: () => api<Cert[]>("/me/certificates") });
  const upcoming = useMyClasses("upcoming");
  const past = useMyClasses("past");
  const careers = useQuery({ queryKey: ["careers"], queryFn: () => api<{ id: string; slug: string; title: string; role: string; steps: number; stepsDone: number; joined: boolean; credentialCode?: string }[]>("/careers") });
  const myPath = careers.data?.find((p) => p.joined);
  const game = useProgress();
  const suggestedPath = careers.data?.[0];

  const today = new Date(now);
  const weekEnd = now + 7 * 86_400_000;
  const all = upcoming.data ?? [];
  const todays = all.filter((c) => sameDay(toDate(c.startsAt), today) || c.status === "Live");
  const comingUp = all.filter((c) => !todays.includes(c) && toDate(c.startsAt).getTime() < weekEnd);
  const thisWeek = all.filter((c) => toDate(c.startsAt).getTime() < weekEnd).length;
  const open = all.find((c) => canEnter(c, now));
  const inProgress = enrollments.data?.filter((e) => e.status === "Active") ?? [];
  const mineAsLearner = past.data?.filter((c) => !c.isHost && c.myStatus) ?? [];
  const attended = mineAsLearner.filter((c) => c.myStatus === "Present").length;
  const hosted = past.data?.filter((c) => c.isHost && c.status === "Ended") ?? [];
  const teaches = can("course.create");
  const attendanceRate = teaches
    ? hosted.reduce((s, c) => s + c.registered, 0) ? Math.round((hosted.reduce((s, c) => s + c.present, 0) / hosted.reduce((s, c) => s + c.registered, 0)) * 100) : null
    : mineAsLearner.length ? Math.round((attended / mineAsLearner.length) * 100) : null;
  const lessonsDone = inProgress.reduce((s, e) => s + e.lessonsCompleted, 0);
  const lessonsTotal = inProgress.reduce((s, e) => s + e.lessonsTotal, 0);
  const firstName = me?.fullName.split(" ").find((w) => !w.endsWith(".")) ?? "";
  const dateLong = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={portalName(me, can)}
        title={`Welcome back, ${firstName}`}
        subtitle={teaches ? "Here's what's on your plate today — classes to run, attendance and course progress." : "Here's what's on your plate today — live classes, course progress and milestones."}
        action={<Link to="/classes" className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600">View all classes <ArrowRight className="h-4 w-4" aria-hidden /></Link>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={CalendarDays} label="Today's Classes" value={todays.length} />
        <Stat icon={Clock} tone="amber" label="This Week" value={thisWeek} />
        <Stat icon={Users} tone="green" label={teaches ? "Class Attendance" : "My Attendance"} value={attendanceRate == null ? "—" : `${attendanceRate}%`}
          trend={attendanceRate == null ? undefined : { value: `${Math.abs(attendanceRate - 90)}%`, label: "vs 90% target", down: attendanceRate < 90 }} />
        {teaches
          ? <Stat icon={Video} tone="violet" label="Classes Hosted" value={hosted.length} hint="Completed live classes" />
          : <Stat icon={Award} tone="violet" label="Certificates" value={certs.data?.length ?? "—"} />}
      </div>

      {game.data && (
        <Card className="flex flex-wrap items-center gap-x-8 gap-y-4 px-6 py-5">
          <Link to="/progress" className="flex items-center gap-4">
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full" style={{ background: `conic-gradient(#ff7a03 ${levelPercent(game.data.xp, game.data.level) * 3.6}deg, #f1f5f9 0deg)` }}>
              <span className="flex h-11 w-11 flex-col items-center justify-center rounded-full bg-white">
                <span className="font-display text-lg font-bold leading-none text-ink">{game.data.level.number}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-mute">Level</span>
              </span>
            </span>
            <span>
              <span className="block font-semibold text-ink">{game.data.level.title}</span>
              <span className="block text-sm text-ink-mute">{game.data.level.nextXp ? `${game.data.level.nextXp - game.data.xp} XP to level ${game.data.level.number + 1}` : "Top level"}</span>
            </span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-brand-500" aria-hidden /><span><span className="font-bold text-ink">{game.data.xp.toLocaleString()}</span> <span className="text-ink-mute">XP</span></span></span>
            <span className="flex items-center gap-2"><Flame className="h-4 w-4 text-orange-500" aria-hidden /><span><span className="font-bold text-ink">{game.data.streak.current}</span> <span className="text-ink-mute">day streak</span></span></span>
            <span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" aria-hidden /><span><span className="font-bold text-ink">{game.data.badges.filter((b) => b.earned).length}</span> <span className="text-ink-mute">badges</span></span></span>
          </div>
          <div className="flex items-center -space-x-2">
            {game.data.badges.filter((b) => b.earned).slice(0, 5).map((b) => <span key={b.key} title={b.name} className="rounded-full ring-2 ring-white"><Medal badge={b} size="sm" /></span>)}
          </div>
          {inProgress[0] && (
            <Link to={`/practice/${inProgress[0].id}`} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
              <Brain className="h-4 w-4" aria-hidden />Practice with AI
            </Link>
          )}
        </Card>
      )}

      {open && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4">
          <IconTile icon={open.status === "Live" ? Video : AlertTriangle} tone={open.status === "Live" ? "red" : "brand"} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-ink">{open.status === "Live" ? "A live class is in progress" : open.isHost ? "Your class is ready to start" : "Your class is open — join now"}</div>
            <div className="text-sm text-ink-soft">{open.title} ({open.course.title}) — {toDate(open.startsAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}. {open.isHost ? "Learners can join 15 minutes before the start." : "Joining marks you present."}</div>
          </div>
          <ClassAction c={open} />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.75fr_1fr]">
        <Card>
          <CardHeader title="Today's Classes" subtitle={dateLong(today)} />
          <div className="space-y-3 px-5 pb-5">
            {todays.length ? todays.map((c) => <ClassRow key={c.id} c={c} />) : (
              <Empty icon={CalendarClock} title="No classes today">{comingUp[0] ? `Next: ${comingUp[0].title}` : teaches ? <Link to="/classes" className="font-semibold text-brand-700 hover:underline">Schedule a class</Link> : "Enjoy the free time."}</Empty>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Learning Snapshot" subtitle={today.toLocaleDateString(undefined, { month: "long", year: "numeric" })} />
          <div className="px-5 pb-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="font-display text-[28px] font-bold leading-tight text-ink">{lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0}%</div>
                <div className="text-[13px] text-ink-mute">Overall lesson progress</div>
              </div>
              <DotBadge tone={inProgress.length ? "green" : "gray"}>{inProgress.length ? "On track" : "Not started"}</DotBadge>
            </div>
            <Progress value={lessonsTotal ? (lessonsDone / lessonsTotal) * 100 : 0} className="mt-3" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ["Courses", inProgress.length], ["Lessons done", `${lessonsDone}/${lessonsTotal}`],
                ["Classes attended", attended], ["Certificates", certs.data?.length ?? 0],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 px-3.5 py-3">
                  <div className="text-xs text-ink-mute">{k}</div>
                  <div className="mt-0.5 font-bold text-ink">{v}</div>
                </div>
              ))}
            </div>
            {inProgress[0] ? (
              <Link to={`/learn/${inProgress[0].id}`} className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50">
                Continue {inProgress[0].course.title.length > 26 ? "learning" : inProgress[0].course.title} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : (
              <Link to="/courses" className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50">Browse courses <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.75fr_1fr]">
        <RecommendationsCard />
        <Card>
          <CardHeader icon={Rocket} title="My Career Path" subtitle="Meet to Career" />
          <div className="px-5 pb-5">
            {myPath ? (
              <>
                <div className="font-display text-lg font-bold text-ink">{myPath.title}</div>
                {myPath.credentialCode ? (
                  <div className="mt-3 flex items-center gap-3 rounded-xl bg-emerald-50 p-3">
                    <IconTile icon={Award} tone="green" size="sm" />
                    <div><div className="text-sm font-semibold text-ink">Credential earned</div><div className="font-mono text-xs text-emerald-700">{myPath.credentialCode}</div></div>
                  </div>
                ) : (
                  <>
                    <div className="mt-3 flex items-end justify-between text-sm"><span className="text-ink-mute">{myPath.stepsDone} of {myPath.steps} milestones</span><span className="font-bold text-brand-700">{Math.round((myPath.stepsDone / Math.max(1, myPath.steps)) * 100)}%</span></div>
                    <Progress value={(myPath.stepsDone / Math.max(1, myPath.steps)) * 100} className="mt-2" />
                  </>
                )}
                <Link to={`/careers/${myPath.slug}`} className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">Continue path <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </>
            ) : suggestedPath ? (
              <>
                <p className="text-sm text-ink-soft">Work towards a role, not just a course. Start <span className="font-semibold text-ink">{suggestedPath.title}</span> and earn a career credential.</p>
                <Link to={`/careers/${suggestedPath.slug}`} className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"><Rocket className="h-4 w-4" aria-hidden />Explore {suggestedPath.role}</Link>
              </>
            ) : <Empty icon={Rocket} title="No career paths yet" />}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Coming Up This Week" subtitle={`Next 7 days — ${dateLong(new Date(now + 86_400_000))} to ${dateLong(new Date(weekEnd))}`} />
        <div className="space-y-3 px-5 pb-5">
          {comingUp.length ? comingUp.map((c) => <ClassRow key={c.id} c={c} showDate />) : <Empty icon={CalendarDays} title="Nothing else this week" />}
        </div>
      </Card>

      {!!inProgress.length && (
        <Card>
          <CardHeader title="Continue Learning" subtitle="Courses you're enrolled in" action={<Link to="/learn" className="text-sm font-semibold text-brand-700 hover:underline">My Learning</Link>} />
          <div className="grid gap-3 px-5 pb-5 md:grid-cols-2">
            {inProgress.map((e) => {
              const pct = e.lessonsTotal ? (e.lessonsCompleted / e.lessonsTotal) * 100 : 0;
              return (
                <Link key={e.id} to={`/learn/${e.id}`} className="flex items-center gap-4 rounded-2xl border border-slate-200 px-4 py-3.5 transition-colors hover:bg-slate-50">
                  <IconTile icon={pct >= 100 ? GraduationCap : BookOpen} tone="violet" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><span className="truncate font-semibold text-ink">{e.course.title}</span><span className="text-xs font-bold text-brand-700">{Math.round(pct)}%</span></div>
                    <div className="mb-1.5 truncate text-[13px] text-ink-mute">{e.course.instructor} · {e.lessonsCompleted}/{e.lessonsTotal} lessons</div>
                    <Progress value={pct} />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
