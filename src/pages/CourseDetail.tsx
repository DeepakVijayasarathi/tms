import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Award, CalendarDays, Check, CheckCircle2, Link2, MessageCircle } from "lucide-react";
import { api, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dateTime, minutes, money, referral } from "@/lib/format";
import { openRazorpay } from "@/lib/razorpay";
import { Badge, Button, Card, CardHeader, ErrorNote, Spinner, Tabs } from "@/components/ui";
import { CurriculumList, MilestoneTimeline, SyllabusPanel, lines, type MilestoneDef, type SyllabusModule } from "@/components/Syllabus";
import { RichText } from "@/components/RichText";
import { CourseInterestChat } from "@/components/CourseInterestChat";

interface Detail {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  level: string;
  priceMinor: number;
  currency: string;
  status: string;
  instructor: { id: string; fullName: string; headline?: string };
  provider: { id: string; name: string; kind: string; isVerified: boolean };
  minSessionsAttended: number;
  certificateValidityMonths?: number;
  learningOutcomes: string;
  prerequisites: string;
  modules: SyllabusModule[];
  milestones: MilestoneDef[];
  assessments: { title: string; passMarkPercent: number; questions: number }[];
  upcoming: { id: string; title: string; startsAt: string; location?: string }[];
  enrollment?: { id: string; status: string } | null;
  canEdit: boolean;
}

/** Verified vendor companies that publish their own courses and certificates. */
export const isPartner = (p: { kind: string; isVerified: boolean }) => p.isVerified && (p.kind === "TrainingProvider" || p.kind === "Corporate");

export function CourseDetail() {
  const { slug } = useParams();
  const { me } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<{ title: string; content: string } | null>(null);
  const [code, setCode] = useState(referral.get() ?? "");
  const [tab, setTab] = useState<"overview" | "syllabus" | "curriculum" | "milestones">("overview");
  const [params, setParams] = useSearchParams();
  // A shared link like /courses/{slug}?interest=1 opens the "I'm interested" chat straight away.
  const [interested, setInterested] = useState(() => params.has("interest"));
  const [copied, setCopied] = useState(false);
  const closeInterest = () => {
    setInterested(false);
    if (params.has("interest")) { params.delete("interest"); setParams(params, { replace: true }); }
  };

  const course = useQuery({ queryKey: ["course", slug], queryFn: () => api<Detail>(`/courses/${slug}`) });

  const enrol = useMutation({
    mutationFn: async () => {
      const c = course.data!;
      if (c.priceMinor === 0) {
        const e = await post<{ id: string }>(`/courses/${c.id}/enrollments`);
        navigate(`/learn/${e.id}`);
        return;
      }
      const session = await post<{ orderId: string; redirectUrl?: string; provider: string; clientPayload?: unknown }>("/checkout/sessions", {
        courseId: c.id,
        referralCode: code.trim() || null,
      });
      if (session.redirectUrl) {
        navigate(new URL(session.redirectUrl).pathname);
      } else if (session.provider === "razorpay" && session.clientPayload) {
        const outcome = await openRazorpay(session.clientPayload as Parameters<typeof openRazorpay>[0], c.title);
        if (outcome === "completed") navigate(`/orders/${session.orderId}`);
      } else {
        navigate(`/orders/${session.orderId}`);
      }
    },
  });

  const showPreview = useMutation({
    mutationFn: (lessonId: string) => api<{ title: string; content: string }>(`/courses/${course.data!.id}/lessons/${lessonId}/preview`),
    onSuccess: setPreview,
  });

  if (course.isLoading) return <Spinner />;
  if (course.error || !course.data) return <ErrorNote error={course.error ?? "Course not found"} />;
  const c = course.data;
  const totalMinutes = c.modules.flatMap((m) => m.lessons).reduce((s, l) => s + l.durationMinutes, 0);
  const lessonCount = c.modules.flatMap((m) => m.lessons).length;
  const canRegisterInterest = c.status === "Published" && !c.enrollment;
  const copyInterestLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/courses/${c.slug}?interest=1`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone="blue">{c.category}</Badge>
          <Badge>{c.level}</Badge>
          {c.status !== "Published" && <Badge tone="amber">{c.status}</Badge>}
          {isPartner(c.provider) && <Badge tone="green">Partner course</Badge>}
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink">{c.title}</h1>
        <p className="mt-3 text-lg text-ink-soft">{c.summary}</p>
        <p className="mt-4 text-sm text-ink-mute">
          Taught by <span className="font-medium text-ink">{c.instructor.fullName}</span>
          {c.instructor.headline && <> · {c.instructor.headline}</>} · {c.provider.name}
        </p>

        <div className="mt-6">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "overview", label: "Overview" },
              { value: "syllabus", label: "Syllabus" },
              { value: "curriculum", label: `Curriculum (${lessonCount})` },
              { value: "milestones", label: `Milestones${c.milestones.length ? ` (${c.milestones.length})` : ""}` },
            ]}
          />
          {tab === "overview" && (
            <div className="space-y-6">
              {c.description && (
                <Card className="p-5">
                  <h2 className="mb-3 font-display text-[17px] font-bold">About this course</h2>
                  <RichText text={c.description} />
                </Card>
              )}
              {lines(c.learningOutcomes).length > 0 && (
                <Card className="p-5">
                  <h2 className="mb-3 font-display text-[17px] font-bold">What you'll learn</h2>
                  <ul className="grid gap-2.5 sm:grid-cols-2">
                    {lines(c.learningOutcomes).map((o) => <li key={o} className="flex gap-2 text-sm text-ink-soft"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />{o}</li>)}
                  </ul>
                  <button className="mt-4 text-sm font-semibold text-brand-700 hover:underline" onClick={() => setTab("syllabus")}>See the full syllabus →</button>
                </Card>
              )}
            </div>
          )}
          {tab === "syllabus" && <SyllabusPanel outcomes={c.learningOutcomes} prerequisites={c.prerequisites} modules={c.modules} />}
          {tab === "curriculum" && <CurriculumList modules={c.modules} onPreview={(id) => showPreview.mutate(id)} />}
          {tab === "milestones" && <MilestoneTimeline defs={c.milestones} />}
        </div>

        {preview && (
          <Card className="mt-6">
            <CardHeader title={`Preview: ${preview.title}`} action={<Button variant="ghost" size="sm" onClick={() => setPreview(null)}>Close</Button>} />
            <div className="p-5"><RichText text={preview.content} /></div>
          </Card>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          <div className="text-3xl font-semibold text-ink">{c.priceMinor === 0 ? "Free" : money(c.priceMinor, c.currency)}</div>
          {c.priceMinor > 0 && <p className="text-xs text-ink-mute">Inclusive of GST</p>}

          <div className="mt-4">
            {c.enrollment ? (
              <Link to={`/learn/${c.enrollment.id}`} className="flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                Continue learning
              </Link>
            ) : me ? (
              <>
                {c.priceMinor > 0 && (
                  <label className="mb-3 block">
                    <span className="mb-1 block text-xs font-medium text-ink-mute">Referral code (optional)</span>
                    <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase" placeholder="e.g. FRIEND10" />
                  </label>
                )}
                <Button className="w-full py-2.5" loading={enrol.isPending} onClick={() => enrol.mutate()}>
                  {c.priceMinor === 0 ? "Enrol for free" : "Buy course"}
                </Button>
              </>
            ) : (
              <Link to={`/login?next=/courses/${c.slug}`} className="flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white">
                Sign in to enrol
              </Link>
            )}
            <div className="mt-3"><ErrorNote error={enrol.error} /></div>
            {canRegisterInterest && (
              <Button variant="secondary" className="w-full py-2.5" onClick={() => setInterested(true)}>
                <MessageCircle className="h-4 w-4" aria-hidden /> I'm interested
              </Button>
            )}
          </div>

          <ul className="mt-5 space-y-2 text-sm text-ink-soft">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />{lessonCount} lessons, {minutes(totalMinutes)}</li>
            {c.assessments.map((a) => (
              <li key={a.title} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />{a.title}: {a.questions} questions, pass at {a.passMarkPercent}%</li>
            ))}
            {c.minSessionsAttended > 0 && (
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />Attend {c.minSessionsAttended} live class(es)</li>
            )}
            <li className="flex gap-2">
              <Award className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              Verifiable certificate{isPartner(c.provider) ? ` issued by ${c.provider.name}` : ""}{c.certificateValidityMonths ? `, valid ${c.certificateValidityMonths} months` : ""}
            </li>
          </ul>
          {c.canEdit && c.status === "Published" && (
            <button onClick={copyInterestLink} className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-ink-soft hover:bg-slate-50">
              {copied ? <><Check className="h-4 w-4 text-emerald-600" aria-hidden /> Link copied</> : <><Link2 className="h-4 w-4" aria-hidden /> Copy interest link to share</>}
            </button>
          )}
          {c.canEdit && (
            <Link to={`/teach/courses/${c.id}`} className="mt-4 block text-center text-sm font-medium text-brand-700 hover:underline">Edit this course</Link>
          )}
        </Card>

        {c.upcoming.length > 0 && (
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-brand-600" aria-hidden /> Upcoming live classes</h3>
            <ul className="space-y-3 text-sm">
              {c.upcoming.map((s) => (
                <li key={s.id}>
                  <div className="font-medium text-ink">{s.title}</div>
                  <div className="text-ink-mute">{dateTime(s.startsAt)}{s.location && ` · ${s.location}`}</div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </aside>
      {interested && canRegisterInterest && <CourseInterestChat course={c} onClose={closeInterest} />}
    </div>
  );
}
