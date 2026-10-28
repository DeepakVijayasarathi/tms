import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Award, BookOpen, Bot, Clock, Search, Users, Video } from "lucide-react";
import { api } from "@/lib/api";
import { minutes, money } from "@/lib/format";
import type { CourseCard } from "@/lib/types";
import { Avatar, Badge, Card, Empty, ErrorNote, Input, Select, Spinner } from "@/components/ui";
import { isPartner } from "@/pages/CourseDetail";

export function Catalog() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");

  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (category) params.set("category", category);
  if (level) params.set("level", level);

  const courses = useQuery({ queryKey: ["courses", params.toString()], queryFn: () => api<CourseCard[]>(`/courses?${params}`) });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => api<string[]>("/courses/categories") });

  return (
    <div>
      <section className="relative mb-8 overflow-hidden rounded-3xl bg-navy px-6 py-10 text-white shadow-pop sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 92% 95%, rgb(255 98 3 / .45), transparent 45%), radial-gradient(circle at 5% 0%, rgb(254 150 3 / .2), transparent 40%)" }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.10]" style={{ backgroundImage: "radial-gradient(rgb(255 255 255) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="relative">
          <div className="mb-5 flex flex-wrap gap-2">
            {[{ icon: Video, label: "Live classes" }, { icon: Award, label: "Verified certificates" }, { icon: Bot, label: "AI tutor" }].map((f) => (
              <span key={f.label} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/15">
                <f.icon className="h-3.5 w-3.5 text-brand-300" aria-hidden />{f.label}
              </span>
            ))}
          </div>
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.1] sm:text-5xl">Learn live from professors. <span className="text-brand-400">Earn credentials that verify.</span></h1>
          <p className="mt-4 max-w-2xl text-white/75">
            Self-paced lessons, live virtual classrooms, graded assessments and an AI tutor grounded in each course's own material.
          </p>
          <div className="relative mt-7 max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses, skills or topics" className="h-12 rounded-xl border-0 pl-11 text-base shadow-lg" aria-label="Search courses" />
          </div>
        </div>
      </section>

      <div className="mb-5 flex flex-wrap gap-3">
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto" aria-label="Category">
          <option value="">All categories</option>
          {categories.data?.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select value={level} onChange={(e) => setLevel(e.target.value)} className="w-auto" aria-label="Level">
          <option value="">All levels</option>
          <option>Beginner</option>
          <option>Intermediate</option>
          <option>Advanced</option>
        </Select>
      </div>

      <ErrorNote error={courses.error} />
      {courses.isLoading ? (
        <Spinner label="Loading courses" />
      ) : courses.data?.length === 0 ? (
        <Card><Empty title="No courses match">Try a different search or clear the filters.</Empty></Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.data?.map((c) => (
            <Link key={c.id} to={`/courses/${c.slug}`} className="group">
              <Card className="flex h-full flex-col p-6 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-slate-300 group-hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-ink-soft ring-1 ring-slate-200 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:ring-brand-200">
                    <BookOpen className="h-5 w-5" aria-hidden />
                  </span>
                  <span className={c.priceMinor === 0 ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-ink"}>
                    {c.priceMinor === 0 ? "Free" : money(c.priceMinor, c.currency)}
                  </span>
                </div>
                <div className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-mute">{c.category} · {c.level}</div>
                <h3 className="mt-1.5 font-display text-lg font-bold leading-snug text-ink">{c.title}</h3>
                <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-ink-mute">{c.summary}</p>
                <div className="mt-5 flex items-center gap-2.5">
                  <Avatar name={c.instructor} className="h-7 w-7 text-[11px]" />
                  <span className="truncate text-sm text-ink-soft">{c.instructor} <span className="text-ink-mute">· {c.provider}</span></span>
                  {isPartner({ kind: c.providerKind, isVerified: c.providerVerified }) && <span className="ml-auto"><Badge tone="green">Partner</Badge></span>}
                </div>
                <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-4 text-[13px] text-ink-mute">
                  <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" aria-hidden />{c.lessons} lessons</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden />{minutes(c.minutes)}</span>
                  <span className="ml-auto flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden />{c.learners}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
