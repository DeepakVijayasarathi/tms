import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Award, BookOpen, CheckCircle2, Clock, Flag, GraduationCap, Plus, Rocket, Trash2, Users, Video } from "lucide-react";
import { api, del, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { minutes, money } from "@/lib/format";
import { lines } from "@/components/Syllabus";
import { Button, Card, CardHeader, Empty, ErrorNote, Field, IconTile, Input, PageHeader, Progress, Select, Spinner, StatusBadge, Textarea, cx } from "@/components/ui";

interface PathCard {
  id: string; slug: string; title: string; role: string; summary: string; credentialPrefix: string; skills: string;
  steps: number; courses: number; minutes: number; learners: number; joined: boolean; stepsDone: number; completedAt?: string; credentialCode?: string;
}
interface StepProgress { achieved: boolean; current: number; total: number; enrollmentId?: string }
interface PathDetail {
  id: string; slug: string; title: string; role: string; summary: string; description: string; skills: string; credentialPrefix: string; isPublished: boolean; learners: number;
  steps: {
    id: string; order: number; title: string; description?: string; kind: "CompleteCourse" | "AttendClasses"; requiredCount: number;
    course?: { id: string; slug: string; title: string; summary: string; level: string; priceMinor: number; currency: string; instructor?: string } | null;
    progress?: StepProgress | null;
  }[];
  enrollment?: { id: string; createdAt: string; completedAt?: string; credentialCode?: string } | null;
  canManage: boolean;
}

export function Careers() {
  const paths = useQuery({ queryKey: ["careers"], queryFn: () => api<PathCard[]>("/careers") });
  return (
    <div>
      <PageHeader eyebrow="Meet to Career" title="Career Paths" subtitle="Role-based paths of courses and live classes. Hit every milestone to earn a career credential." />
      <ErrorNote error={paths.error} />
      {paths.isLoading ? <Spinner label="Loading career paths" /> : !paths.data?.length ? <Card><Empty icon={Rocket} title="No career paths yet" /></Card> : (
        <div className="grid gap-6 lg:grid-cols-2">
          {paths.data.map((p) => (
            <Link key={p.id} to={`/careers/${p.slug}`} className="group">
              <div className="relative h-full overflow-hidden rounded-3xl bg-navy p-7 text-white shadow-pop transition-transform group-hover:-translate-y-0.5">
                <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 100% 100%, rgb(255 122 3 / .45), transparent 50%)" }} />
                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-300"><Rocket className="h-3.5 w-3.5" aria-hidden />{p.credentialPrefix} career path</span>
                    {p.completedAt ? <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold"><Award className="h-3.5 w-3.5" aria-hidden />Credential earned</span>
                      : p.joined && <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{p.stepsDone}/{p.steps} milestones</span>}
                  </div>
                  <h2 className="mt-5 font-display text-3xl font-bold leading-tight">{p.title}</h2>
                  <p className="mt-2 text-white/75">{p.summary}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {lines(p.skills).slice(0, 4).map((s) => <span key={s} className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/85">{s}</span>)}
                  </div>
                  {p.joined && <Progress value={(p.stepsDone / Math.max(1, p.steps)) * 100} className="mt-5 bg-white/15" />}
                  <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
                    <span className="flex items-center gap-1.5"><Flag className="h-4 w-4" aria-hidden />{p.steps} milestones</span>
                    <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" aria-hidden />{p.courses} courses</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden />{minutes(p.minutes)}</span>
                    <span className="flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden />{p.learners} learner{p.learners === 1 ? "" : "s"}</span>
                    <span className="ml-auto flex items-center gap-1 font-semibold text-white">{p.joined ? "Continue" : "View path"}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function CareerPathPage() {
  const { slug } = useParams();
  const { me } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const path = useQuery({ queryKey: ["career", slug], queryFn: () => api<PathDetail>(`/careers/${slug}`) });
  const join = useMutation({
    mutationFn: () => post(`/careers/${path.data!.id}/join`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["career", slug] }); qc.invalidateQueries({ queryKey: ["careers"] }); },
  });

  if (path.isLoading) return <Spinner />;
  if (!path.data) return <ErrorNote error={path.error ?? "Career path not found"} />;
  const p = path.data;
  const done = p.steps.filter((s) => s.progress?.achieved).length;
  const pct = p.steps.length ? (done / p.steps.length) * 100 : 0;
  const nextIdx = p.steps.findIndex((s) => !s.progress?.achieved);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-navy px-6 py-9 text-white shadow-pop sm:px-10">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 95% 100%, rgb(255 122 3 / .45), transparent 45%), radial-gradient(circle at 0% 0%, rgb(254 150 3 / .15), transparent 40%)" }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(rgb(255 255 255) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="relative grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-300"><Rocket className="h-3.5 w-3.5" aria-hidden />Meet to Career</span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight">{p.title}</h1>
            <p className="mt-3 max-w-2xl text-white/80">{p.summary}</p>
            <div className="mt-5 flex flex-wrap gap-2">{lines(p.skills).map((s) => <span key={s} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">{s}</span>)}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-md">
            {p.enrollment?.credentialCode ? (
              <div className="text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500"><Award className="h-7 w-7" aria-hidden /></span>
                <div className="mt-3 font-display text-xl font-bold">You're a {p.role}!</div>
                <div className="mt-1 text-sm text-white/70">Career credential</div>
                <div className="mt-2 font-mono text-lg font-bold tracking-wider text-brand-300">{p.enrollment.credentialCode}</div>
              </div>
            ) : p.enrollment ? (
              <>
                <div className="flex items-end justify-between"><span className="text-sm text-white/70">Your progress</span><span className="font-display text-3xl font-bold">{Math.round(pct)}%</span></div>
                <Progress value={pct} className="mt-2 bg-white/15" />
                <p className="mt-3 text-sm text-white/80">{done} of {p.steps.length} milestones complete{nextIdx >= 0 && <> · next: <span className="font-semibold text-white">{p.steps[nextIdx]!.title}</span></>}</p>
              </>
            ) : (
              <>
                <div className="text-sm text-white/70">Become a</div>
                <div className="font-display text-2xl font-bold">{p.role}</div>
                <ul className="mt-3 space-y-1.5 text-sm text-white/80">
                  <li className="flex gap-2"><Flag className="h-4 w-4 shrink-0 text-brand-300" aria-hidden />{p.steps.length} milestones</li>
                  <li className="flex gap-2"><Award className="h-4 w-4 shrink-0 text-brand-300" aria-hidden />{p.credentialPrefix} career credential on completion</li>
                  <li className="flex gap-2"><Users className="h-4 w-4 shrink-0 text-brand-300" aria-hidden />{p.learners} learner{p.learners === 1 ? "" : "s"} on this path</li>
                </ul>
                <button
                  onClick={() => (me ? join.mutate() : navigate(`/login?next=/careers/${p.slug}`))}
                  disabled={join.isPending}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600 disabled:opacity-70"
                >
                  <Rocket className="h-4 w-4" aria-hidden />Start this path
                </button>
                <div className="mt-2"><ErrorNote error={join.error} /></div>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader icon={Flag} title={`Your path to ${p.role}`} subtitle="Complete each step — progress updates automatically as you learn." />
          <ol className="px-5 pb-5 pt-2">
            {p.steps.map((s, i) => {
              const achieved = !!s.progress?.achieved;
              const isNext = i === nextIdx && !!p.enrollment;
              const last = i === p.steps.length - 1;
              return (
                <li key={s.id} className="relative flex gap-4 pb-5 last:pb-0">
                  {!last && <span className={cx("absolute left-6 top-14 h-[calc(100%-3.5rem)] w-0.5", achieved ? "bg-emerald-300" : "bg-slate-200")} aria-hidden />}
                  <span className={cx("relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-bold ring-4 ring-white",
                    achieved ? "bg-emerald-500 text-white" : isNext ? "bg-brand-500 text-white" : "bg-slate-100 text-ink-soft")}>
                    {achieved ? <CheckCircle2 className="h-6 w-6" aria-hidden /> : i + 1}
                  </span>
                  <div className={cx("min-w-0 flex-1 rounded-2xl border p-4", isNext ? "border-brand-200 bg-brand-50/50" : "border-slate-200")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-ink">{s.title}</h3>
                      {p.enrollment && <StatusBadge status={achieved ? "Achieved" : isNext ? "InProgress" : "Upcoming"} label={achieved ? "Achieved" : isNext ? "Up next" : "Upcoming"} />}
                    </div>
                    {s.description && <p className="mt-1 text-sm text-ink-soft">{s.description}</p>}
                    {s.kind === "CompleteCourse" && s.course ? (
                      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                        <IconTile icon={GraduationCap} tone="violet" size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-ink">{s.course.title}</div>
                          <div className="text-xs text-ink-mute">{s.course.level} · {s.course.instructor} · {s.course.priceMinor ? money(s.course.priceMinor, s.course.currency) : "Free"}</div>
                        </div>
                        <Link
                          to={s.progress?.enrollmentId ? `/learn/${s.progress.enrollmentId}` : `/courses/${s.course.slug}`}
                          className={cx("whitespace-nowrap rounded-xl px-3 py-1.5 text-[13px] font-semibold", s.progress?.enrollmentId ? "bg-brand-500 text-white hover:bg-brand-600" : "border border-slate-200 text-ink-soft hover:bg-slate-50")}
                        >
                          {achieved ? "Review" : s.progress?.enrollmentId ? "Continue" : "View course"}
                        </Link>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <IconTile icon={Video} tone="red" size="sm" />
                        <div className="flex-1 text-sm text-ink-soft">Attend {s.requiredCount} live class{s.requiredCount === 1 ? "" : "es"} from courses on this path</div>
                        {s.progress && <span className="flex items-center gap-2 text-xs text-ink-mute">{s.progress.current}/{s.progress.total}<Progress value={(s.progress.current / s.progress.total) * 100} className="h-1.5 w-20" /></span>}
                        <Link to="/classes" className="whitespace-nowrap rounded-xl border border-slate-200 px-3 py-1.5 text-[13px] font-semibold text-ink-soft hover:bg-slate-50">Live classes</Link>
                      </div>
                    )}
                    {p.canManage && <RemoveStep id={s.id} slug={p.slug} />}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader icon={Rocket} title={`About the ${p.role} role`} />
            <p className="whitespace-pre-line px-5 pb-5 text-sm leading-6 text-ink-soft">{p.description}</p>
          </Card>
          {p.canManage && <AddStep pathId={p.id} slug={p.slug} />}
        </div>
      </div>
    </div>
  );
}

function RemoveStep({ id, slug }: { id: string; slug: string }) {
  const qc = useQueryClient();
  const remove = useMutation({ mutationFn: () => del(`/career-steps/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["career", slug] }) });
  return (
    <button className="mt-3 flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline" onClick={() => { if (confirm("Remove this step from the path?")) remove.mutate(); }}>
      <Trash2 className="h-3.5 w-3.5" aria-hidden />Remove step
    </button>
  );
}

function AddStep({ pathId, slug }: { pathId: string; slug: string }) {
  const qc = useQueryClient();
  const courses = useQuery({ queryKey: ["courses", ""], queryFn: () => api<{ id: string; title: string }[]>("/courses") });
  const [f, setF] = useState({ kind: "CompleteCourse", courseId: "", requiredCount: 2, title: "", description: "" });
  const add = useMutation({
    mutationFn: () => post(`/careers/${pathId}/steps`, {
      kind: f.kind, courseId: f.kind === "CompleteCourse" ? f.courseId || courses.data?.[0]?.id : null,
      requiredCount: f.requiredCount, title: f.title || null, description: f.description || null,
    }),
    onSuccess: () => { setF({ ...f, title: "", description: "" }); qc.invalidateQueries({ queryKey: ["career", slug] }); },
  });
  const submit = (e: FormEvent) => { e.preventDefault(); add.mutate(); };
  return (
    <Card>
      <CardHeader icon={Plus} title="Add a milestone step" subtitle="Visible to platform staff only" />
      <form onSubmit={submit} className="space-y-3 px-5 pb-5">
        <Field label="Requirement">
          <Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            <option value="CompleteCourse">Complete a course</option>
            <option value="AttendClasses">Attend live classes</option>
          </Select>
        </Field>
        {f.kind === "CompleteCourse" ? (
          <Field label="Course">
            <Select value={f.courseId} onChange={(e) => setF({ ...f, courseId: e.target.value })}>
              {courses.data?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </Field>
        ) : <Field label="Classes to attend"><Input type="number" min="1" value={f.requiredCount} onChange={(e) => setF({ ...f, requiredCount: +e.target.value })} /></Field>}
        <Field label="Step title (optional)"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Defaults to the course title" /></Field>
        <Field label="Description (optional)"><Textarea className="min-h-16" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Button type="submit" loading={add.isPending}><Plus className="h-4 w-4" aria-hidden />Add step</Button>
        <ErrorNote error={add.error} />
      </form>
    </Card>
  );
}
