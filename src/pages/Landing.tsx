import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, Award, BadgeCheck, Bell, BookOpen, Brain, CalendarClock, CheckCircle2, Clock, Flame, GraduationCap, LineChart, Menu,
  MessageSquare, Presentation, Rocket, ShieldCheck, Sparkles, Trophy, Video, Wallet, X, Zap, type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { minutes, money } from "@/lib/format";
import type { CourseCard } from "@/lib/types";
import { Medal } from "@/components/Badges";
import { cx } from "@/components/ui";

interface PathCard { id: string; slug: string; title: string; role: string; summary: string; steps: number; courses: number; minutes: number; credentialPrefix: string }
interface PathDetail { steps: { id: string; title: string; description?: string; kind: string }[] }

export function Landing() {
  const courses = useQuery({ queryKey: ["courses", ""], queryFn: () => api<CourseCard[]>("/courses") });
  const paths = useQuery({ queryKey: ["careers"], queryFn: () => api<PathCard[]>("/careers") });
  const fde = paths.data?.[0];
  const fdeDetail = useQuery({ queryKey: ["career", fde?.slug], queryFn: () => api<PathDetail>(`/careers/${fde!.slug}`), enabled: !!fde });

  return (
    <div className="min-h-screen bg-white text-ink">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 85% 10%, rgb(255 122 3 / .10), transparent 70%), radial-gradient(ellipse 50% 40% at 0% 100%, rgb(124 58 237 / .06), transparent 70%)" }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.35]" style={{ backgroundImage: "linear-gradient(rgb(226 232 240 / .6) 1px, transparent 1px), linear-gradient(90deg, rgb(226 232 240 / .6) 1px, transparent 1px)", backgroundSize: "48px 48px", maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)" }} />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-28 pt-14 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pb-36 lg:pt-20">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink-soft shadow-sm backdrop-blur">
              <span className="flex h-1.5 w-1.5 rounded-full bg-brand-500" />Live classes · AI practice · Career paths
            </span>
            <h1 className="mt-6 font-display text-[44px] font-extrabold leading-[1.04] tracking-tight sm:text-6xl">
              Learn live.<br />Practise with AI.<br /><span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">Launch your career.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink-soft">
              TMS Learning brings live virtual classrooms, an AI interviewer and practice arena, and role-based career paths into one platform — with certificates anyone can verify.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-6 text-[15px] font-semibold text-white shadow-lg shadow-brand-500/25 transition-colors hover:bg-brand-600">
                Get started free <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link to="/courses" className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-[15px] font-semibold text-ink transition-colors hover:border-slate-300 hover:bg-slate-50">
                Explore courses
              </Link>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-slate-200 pt-6">
              <Stat value={courses.data ? String(courses.data.length) : "—"} label="Courses with live classes" />
              <Stat value={paths.data ? String(paths.data.length) : "—"} label={paths.data?.length === 1 ? "Career path" : "Career paths"} />
              <Stat value="Gemini" label="AI interviewer & practice" />
            </dl>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* Feature bento */}
      <section id="features" className="border-t border-slate-100 bg-[#f6f7f9] py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <SectionHead eyebrow="Platform" title="Everything a modern learner needs, in one place" text="Built for focus: learn with an instructor, prove it with AI, and track every step toward the role you want." />
          <div className="mt-14 grid gap-5 md:grid-cols-6">
            <Feature className="md:col-span-4" icon={Video} tone="red" title="Live virtual classroom" text="Join scheduled classes in a built-in video room — no downloads. Attendance is recorded the moment you join, and hosts get moderator controls.">
              <div className="mt-6 flex flex-wrap gap-2">{["One-click join", "Auto attendance", "Host controls", "Calendar view"].map((t) => <Chip key={t}>{t}</Chip>)}</div>
            </Feature>
            <Feature className="md:col-span-2" icon={MessageSquare} tone="violet" title="AI interviewer" text="A conversational viva that asks, probes with follow-ups and scores you on understanding, application and communication." />
            <Feature className="md:col-span-2" icon={Brain} tone="indigo" title="AI practice arena" text="Five-question rounds written from your course. Instant feedback, combos, XP — and difficulty that adapts to you." />
            <Feature className="md:col-span-2" icon={Trophy} tone="amber" title="Badges & progress" text="Levels, streaks, a learning heatmap and 15 badges from bronze to platinum keep momentum high." />
            <Feature className="md:col-span-2" icon={Bell} tone="sky" title="Smart reminders" text="An agent follows up for you: classes starting, milestones due, tests waiting and gentle nudges when you drift." />
            <Feature className="md:col-span-3" icon={BadgeCheck} tone="green" title="Certificates anyone can verify" text="Every certificate has a public verification page with a unique credential code — share it with employers in one link." />
            <Feature className="md:col-span-3" icon={GraduationCap} tone="brand" title="Syllabus, milestones & curriculum" text="See outcomes and the week-by-week plan before you enrol, then watch milestones tick off automatically as you learn." />
          </div>
        </div>
      </section>

      {/* Meet to Career */}
      <section id="careers" className="py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <SectionHead align="left" eyebrow="Meet to Career" title={fde?.title ?? "Career paths built around real roles"} text={fde?.summary ?? "Follow a path of courses and live practice, hit every milestone, and earn a career credential."} />
            <ul className="mt-8 space-y-3 text-[15px] text-ink-soft">
              <li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden />Milestones that update automatically as you complete courses and attend classes</li>
              <li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden />AI recommendations matched to your interests</li>
              <li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden />A {fde?.credentialPrefix ?? "career"} credential when you finish every step</li>
            </ul>
            <Link to={fde ? `/careers/${fde.slug}` : "/careers"} className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-navy px-6 text-[15px] font-semibold text-white transition-colors hover:bg-navy-800">
              <Rocket className="h-4 w-4" aria-hidden />Explore the path
            </Link>
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-navy p-7 text-white shadow-2xl sm:p-9">
            <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 100% 0%, rgb(255 122 3 / .35), transparent 50%)" }} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-300">{fde?.role ?? "Career path"}</span>
                {fde && <span className="text-xs text-white/60">{fde.steps} milestones · {minutes(fde.minutes)}</span>}
              </div>
              <ol className="mt-6 space-y-4">
                {(fdeDetail.data?.steps ?? []).map((s, i) => (
                  <li key={s.id} className="flex gap-4">
                    <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display font-bold", i === 0 ? "bg-brand-500" : "bg-white/10")}>{i + 1}</span>
                    <div className="min-w-0 border-b border-white/10 pb-4">
                      <div className="font-semibold">{s.title}</div>
                      {s.description && <div className="mt-0.5 text-sm text-white/60">{s.description}</div>}
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white/10 p-4">
                <Award className="h-8 w-8 text-yellow-300" aria-hidden />
                <div><div className="font-semibold">{fde?.credentialPrefix ?? "Career"} credential</div><div className="text-sm text-white/60">Awarded when every milestone is complete</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-100 bg-[#f6f7f9] py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <SectionHead eyebrow="How it works" title="From first lesson to verified credential" />
          <div className="mt-14 grid gap-6 md:grid-cols-4">
            {[
              { icon: Sparkles, title: "Pick your interests", text: "Get AI recommendations for courses and career paths that fit." },
              { icon: BookOpen, title: "Learn & join live", text: "Self-paced lessons plus live classes with your instructor." },
              { icon: Brain, title: "Practise & interview", text: "AI practice rounds and an AI interview check you really get it." },
              { icon: ShieldCheck, title: "Get certified", text: "Earn certificates and career credentials anyone can verify." },
            ].map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
                <span className="absolute right-5 top-5 font-display text-4xl font-extrabold text-slate-100">0{i + 1}</span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><s.icon className="h-5 w-5" aria-hidden /></span>
                <h3 className="mt-5 font-display text-lg font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-ink-mute">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses */}
      {!!courses.data?.length && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHead align="left" eyebrow="Courses" title="Start learning today" />
              <Link to="/courses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">Browse all courses <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {courses.data.slice(0, 3).map((c) => (
                <Link key={c.id} to={`/courses/${c.slug}`} className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-mute">{c.category}</span>
                    <span className={cx("rounded-full px-2.5 py-1 text-xs font-bold", c.priceMinor ? "bg-slate-100 text-ink" : "bg-emerald-50 text-emerald-700")}>{c.priceMinor ? money(c.priceMinor, c.currency) : "Free"}</span>
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold leading-snug">{c.title}</h3>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-ink-mute">{c.summary}</p>
                  <div className="mt-5 flex items-center gap-4 border-t border-slate-100 pt-4 text-[13px] text-ink-mute">
                    <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" aria-hidden />{c.lessons} lessons</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden />{minutes(c.minutes)}</span>
                    <span className="ml-auto font-semibold text-ink group-hover:text-brand-700">View →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Institutes */}
      <section id="institutes" className="border-t border-slate-100 bg-[#f6f7f9] py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHead align="left" eyebrow="For colleges & instructors" title="Run your academy on TMS" text="Publish courses, plan syllabi with AI, teach live and get paid — with the reporting your institution needs." />
            <Link to="/register" className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-6 text-[15px] font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600">
              <Presentation className="h-4 w-4" aria-hidden />Start teaching
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Sparkles, title: "Plan with Gemini", text: "Draft outcomes, a weekly plan and milestones from your own lessons." },
              { icon: CalendarClock, title: "Teach live", text: "Schedule classes, start the room, and see who attended automatically." },
              { icon: Wallet, title: "Transparent earnings", text: "Versioned commission plans, staged referral payouts and a full audit trail." },
              { icon: LineChart, title: "Institution analytics", text: "Enrolments, completions, scores and revenue for your whole catalog." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white"><f.icon className="h-5 w-5" aria-hidden /></span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm leading-6 text-ink-mute">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-20 sm:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-navy px-6 py-16 text-center text-white sm:px-16">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 50% 130%, rgb(255 122 3 / .55), transparent 60%)" }} />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-4xl font-extrabold leading-tight sm:text-5xl">Your next role starts with one live class.</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">Create a free account, tell us your interests and get a personal learning plan in minutes.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-7 text-[15px] font-semibold text-white hover:bg-brand-600">Get started free <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <Link to="/login" className="inline-flex h-12 items-center rounded-xl bg-white/10 px-7 text-[15px] font-semibold text-white hover:bg-white/15">Sign in</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 text-sm text-ink-mute sm:px-8">
          <div className="flex items-center gap-2.5"><img src="/logo-icon.png" alt="" className="h-7 w-7 object-contain" /><span className="font-display font-bold text-ink">TMS Learning</span></div>
          <nav className="flex flex-wrap gap-6"><Link to="/courses" className="hover:text-ink">Courses</Link><Link to="/careers" className="hover:text-ink">Meet to Career</Link><Link to="/partners" className="hover:text-ink">Partners</Link><a href="#features" className="hover:text-ink">Features</a><Link to="/login" className="hover:text-ink">Sign in</Link></nav>
          <span>© {new Date().getFullYear()} TMS Learning</span>
        </div>
      </footer>
    </div>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  const links = [{ to: "/courses", label: "Courses" }, { to: "/careers", label: "Meet to Career" }, { to: "/partners", label: "Partners" }, { to: "#features", label: "Features" }, { to: "#institutes", label: "For institutes" }];
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5"><img src="/logo-icon.png" alt="" className="h-9 w-9 object-contain" /><span className="font-display text-lg font-bold">TMS Learning</span></Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-soft md:flex">
          {links.map((l) => l.to.startsWith("#") ? <a key={l.label} href={l.to} className="hover:text-ink">{l.label}</a> : <Link key={l.label} to={l.to} className="hover:text-ink">{l.label}</Link>)}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link to="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-slate-100">Sign in</Link>
          <Link to="/register" className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">Get started</Link>
        </div>
        <button className="ml-auto rounded-lg p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open && (
        <div className="space-y-1 border-t border-slate-100 px-5 py-3 md:hidden">
          {links.map((l) => l.to.startsWith("#") ? <a key={l.label} href={l.to} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-50">{l.label}</a> : <Link key={l.label} to={l.to} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-50">{l.label}</Link>)}
          <div className="flex gap-2 pt-2"><Link to="/login" className="flex-1 rounded-xl border border-slate-200 py-2 text-center text-sm font-semibold">Sign in</Link><Link to="/register" className="flex-1 rounded-xl bg-navy py-2 text-center text-sm font-semibold text-white">Get started</Link></div>
        </div>
      )}
    </header>
  );
}

/** Composed product preview built from the app's own components — not a screenshot. */
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-xl animate-fade-in lg:max-w-none" aria-hidden>
      <div className="relative rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xl shadow-slate-900/10">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 text-xs font-medium text-ink-mute">Learner Portal · Dashboard</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[{ icon: CalendarClock, v: "2", l: "Classes today", t: "bg-brand-50 text-brand-600" }, { icon: Flame, v: "7", l: "Day streak", t: "bg-orange-50 text-orange-600" }, { icon: Zap, v: "1,240", l: "Total XP", t: "bg-violet-50 text-violet-600" }].map((k) => (
            <div key={k.l} className="rounded-2xl border border-slate-100 p-3">
              <span className={cx("flex h-8 w-8 items-center justify-center rounded-lg", k.t)}><k.icon className="h-4 w-4" /></span>
              <div className="mt-2 font-display text-xl font-bold">{k.v}</div>
              <div className="text-[11px] text-ink-mute">{k.l}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/60 p-3.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600"><Video className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">Live lab: shipping on-site</div><div className="text-xs text-ink-mute">Starts now · 24 learners</div></div>
          <span className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">Join class</span>
        </div>
        <div className="mt-3 rounded-2xl border border-slate-100 p-3.5">
          <div className="flex items-center justify-between text-xs"><span className="font-semibold text-ink">Become a Forward Deployed Engineer</span><span className="font-bold text-brand-700">75%</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-3/4 rounded-full bg-brand-500" /></div>
        </div>
      </div>

      <div className="absolute -right-4 -top-12 hidden animate-float rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xl sm:block">
        <div className="flex items-center gap-3">
          <Medal badge={{ icon: "Crosshair", tier: "gold", earned: true, name: "Sharpshooter" }} size="sm" />
          <div><div className="text-xs font-bold text-amber-600">GOLD BADGE</div><div className="text-sm font-semibold">Sharpshooter</div></div>
        </div>
      </div>
      <div className="absolute -bottom-20 -right-6 hidden w-72 animate-float rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xl [animation-delay:1.2s] sm:block">
        <div className="flex items-center gap-2 text-xs font-semibold text-violet-700"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white"><MessageSquare className="h-3.5 w-3.5" /></span>AI Interviewer</div>
        <p className="mt-2 rounded-xl rounded-tl-sm bg-slate-50 px-3 py-2 text-[13px] leading-5 text-ink-soft">Good — and how would you decide when to roll back a release?</p>
        <div className="mt-2 flex justify-end"><span className="rounded-xl rounded-tr-sm bg-violet-600 px-3 py-2 text-[13px] text-white">Agree triggers up front…</span></div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div><dt className="font-display text-2xl font-extrabold text-ink">{value}</dt><dd className="mt-0.5 text-xs leading-5 text-ink-mute">{label}</dd></div>;
}

function SectionHead({ eyebrow, title, text, align = "center" }: { eyebrow: string; title: string; text?: string; align?: "center" | "left" }) {
  return (
    <div className={cx(align === "center" && "mx-auto max-w-2xl text-center")}>
      <span className="text-sm font-bold uppercase tracking-wider text-brand-600">{eyebrow}</span>
      <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-lg leading-8 text-ink-mute">{text}</p>}
    </div>
  );
}

const featureTones: Record<string, string> = {
  red: "bg-red-50 text-red-600", violet: "bg-violet-50 text-violet-600", indigo: "bg-indigo-50 text-indigo-600", amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600", green: "bg-emerald-50 text-emerald-600", brand: "bg-brand-50 text-brand-600",
};
function Feature({ icon: Icon, tone, title, text, className, children }: { icon: LucideIcon; tone: string; title: string; text: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cx("rounded-3xl border border-slate-200/80 bg-white p-7 shadow-card transition-shadow hover:shadow-lg", className)}>
      <span className={cx("flex h-12 w-12 items-center justify-center rounded-2xl", featureTones[tone])}><Icon className="h-6 w-6" aria-hidden /></span>
      <h3 className="mt-5 font-display text-xl font-bold">{title}</h3>
      <p className="mt-2 leading-7 text-ink-mute">{text}</p>
      {children}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-ink-soft">{children}</span>;
}

