import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, List, Plus, Video } from "lucide-react";
import { api, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { displayStatus, durationMinutes, toDate, useMyClasses, type ClassItem } from "@/lib/classes";
import { minutes } from "@/lib/format";
import { ClassAction } from "@/components/ClassCard";
import {
  Badge, Button, Card, CardHeader, Empty, ErrorNote, Field, IconTile, Input, PageHeader, Pagination, SearchInput, Segmented, Select, Spinner, StatusBadge, Table, Td, Textarea, cx,
} from "@/components/ui";

const PAGE_SIZE = 8;
type StatusFilter = "all" | "upcoming" | "Live" | "Ended" | "Cancelled";

export function LiveClasses() {
  const { can } = useAuth();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [scheduling, setScheduling] = useState(false);
  const upcoming = useMyClasses("upcoming");
  const past = useMyClasses("past");
  const teaches = can("course.create");

  // Upcoming soonest-first, then history newest-first.
  const all = useMemo(() => [...(upcoming.data ?? []), ...(past.data ?? [])], [upcoming.data, past.data]);
  const filtered = all.filter((c) => {
    const text = `${c.title} ${c.course.title} ${c.instructor ?? ""}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (status === "upcoming") return c.status === "Scheduled" || c.status === "Live";
    return status === "all" || c.status === status;
  });
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const loading = upcoming.isLoading || past.isLoading;

  return (
    <div>
      <PageHeader
        eyebrow={teaches ? "Teaching" : "Live classroom"}
        title={teaches ? "My Classes" : "Live Classes"}
        subtitle="All your scheduled, live, completed and past classes in one place."
        action={teaches && <Button onClick={() => setScheduling(!scheduling)}><Plus className="h-4 w-4" aria-hidden /> Schedule Class</Button>}
      />

      {scheduling && <ScheduleClass onDone={() => setScheduling(false)} />}

      <div className="mb-4">
        <Segmented value={view} onChange={setView} items={[{ value: "list", label: "List", icon: List }, { value: "calendar", label: "Calendar", icon: CalendarDays }]} />
      </div>

      {view === "calendar" ? <WeekCalendar classes={all} /> : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search classes…" />
            <Select value={status} onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1); }} className="w-48" aria-label="Status">
              <option value="all">All statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="Live">Live now</option>
              <option value="Ended">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </Select>
          </div>

          <ErrorNote error={upcoming.error ?? past.error} />
          <Card>
            {loading ? <Spinner label="Loading classes" /> : !filtered.length ? (
              <Empty icon={Video} title={all.length ? "No classes match" : "No classes yet"}>
                {all.length ? "Try a different search or status." : teaches ? "Schedule a class for one of your courses." : <>Live classes from your enrolled courses appear here. <Link to="/courses" className="font-semibold text-brand-700 hover:underline">Browse courses</Link></>}
              </Empty>
            ) : (
              <Table head={["Class", "Course", "Date & Time", "Status", ""]}>
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <Td>
                      <div className="flex items-center gap-3">
                        <IconTile icon={CalendarClock} tone={c.status === "Live" ? "red" : c.status === "Scheduled" ? "brand" : "slate"} size="sm" />
                        <div className="min-w-0">
                          <div className="font-semibold text-ink">{c.title}</div>
                          <div className="text-[13px] text-ink-mute">{c.location ? "In person" : "Online"} · {minutes(durationMinutes(c.startsAt, c.endsAt))}{c.isHost ? ` · ${c.status === "Scheduled" ? `${c.registered} registered` : `${c.present} attended`}` : ""}</div>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-ink-soft">{c.course.title}{!c.isHost && c.instructor && <div className="text-[13px] text-ink-mute">{c.instructor}</div>}</Td>
                    <Td className="whitespace-nowrap text-ink-soft">{toDate(c.startsAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · {toDate(c.startsAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</Td>
                    <Td><div className="flex flex-wrap gap-1.5"><StatusBadge status={displayStatus(c)} />{!c.isHost && c.myStatus && c.status !== "Scheduled" && <StatusBadge status={c.myStatus} />}{c.isHost && <Badge tone="violet">Host</Badge>}</div></Td>
                    <Td className="text-right"><ClassAction c={c} size="sm" /></Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function WeekCalendar({ classes }: { classes: ClassItem[] }) {
  const [offset, setOffset] = useState(0);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + offset * 7); // Monday
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const todayKey = new Date().toDateString();
  const range = `${days[0]!.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${days[6]!.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
  const nav = "flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-ink-soft hover:bg-slate-50";

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h2 className="font-display text-[17px] font-bold text-ink">{range}</h2>
        <div className="flex items-center gap-2">
          <button className={nav} onClick={() => setOffset(offset - 1)} aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></button>
          <Button size="sm" variant="secondary" onClick={() => setOffset(0)}>Today</Button>
          <button className={nav} onClick={() => setOffset(offset + 1)} aria-label="Next week"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-1 border-t border-slate-200 sm:grid-cols-7">
        {days.map((d) => {
          const items = classes.filter((c) => toDate(c.startsAt).toDateString() === d.toDateString()).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
          const isToday = d.toDateString() === todayKey;
          return (
            <div key={d.toISOString()} className="min-h-40 border-b border-slate-100 p-2.5 sm:border-b-0 sm:border-r sm:last:border-r-0">
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className="text-xs font-semibold uppercase text-ink-mute">{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                <span className={cx("flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold", isToday ? "bg-brand-500 text-white" : "text-ink")}>{d.getDate()}</span>
              </div>
              <div className="space-y-1.5">
                {items.map((c) => (
                  <Link
                    key={c.id}
                    to={`/classes/${c.id}/room`}
                    className={cx(
                      "block rounded-lg border-l-4 px-2 py-1.5 text-xs transition-colors",
                      c.status === "Live" ? "border-red-500 bg-red-50 hover:bg-red-100" : c.status === "Scheduled" ? "border-brand-500 bg-brand-50 hover:bg-brand-100" : c.status === "Cancelled" ? "border-slate-300 bg-slate-50 line-through opacity-70" : "border-emerald-500 bg-emerald-50 hover:bg-emerald-100",
                    )}
                  >
                    <div className="font-bold text-ink">{toDate(c.startsAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
                    <div className="line-clamp-2 text-ink-soft">{c.title}</div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

interface TeachCourse { id: string; title: string; status: string }

/** Quick scheduler for hosts; the course editor's Live classes tab has the same form plus attendance. */
function ScheduleClass({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const courses = useQuery({ queryKey: ["teach-courses"], queryFn: () => api<TeachCourse[]>("/teach/courses") });
  const [f, setF] = useState({ courseId: "", title: "", description: "", startsAt: "", durationMinutes: 60, capacity: 50 });
  const create = useMutation({
    mutationFn: () => {
      const start = new Date(f.startsAt);
      return post(`/courses/${f.courseId || courses.data?.[0]?.id}/sessions`, {
        title: f.title, description: f.description || null, startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + f.durationMinutes * 60_000).toISOString(), capacity: f.capacity,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-classes"] }); onDone(); },
  });
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(); };

  return (
    <Card className="mb-6 animate-slide-up">
      <CardHeader icon={CalendarPlus} title="Schedule a live class" subtitle="Enrolled learners see it in Live Classes and can join from 15 minutes before the start." />
      {courses.data?.length === 0 ? <Empty title="No courses yet"><Link to="/teach" className="font-semibold text-brand-700 hover:underline">Create a course</Link> first.</Empty> : (
        <form onSubmit={submit} className="grid gap-4 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Field label="Course">
              <Select required value={f.courseId} onChange={(e) => setF({ ...f, courseId: e.target.value })}>
                {courses.data?.map((c) => <option key={c.id} value={c.id}>{c.title}{c.status !== "Published" ? ` (${c.status})` : ""}</option>)}
              </Select>
            </Field>
          </div>
          <div className="sm:col-span-2"><Field label="Class title"><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Live Q&A: week 2" /></Field></div>
          <div className="sm:col-span-2 lg:col-span-4"><Field label="What you'll cover (optional)"><Textarea className="min-h-16" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Field label="Starts"><Input type="datetime-local" required value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} /></Field></div>
          <Field label="Duration (min)"><Input type="number" min="15" step="5" value={f.durationMinutes} onChange={(e) => setF({ ...f, durationMinutes: +e.target.value })} /></Field>
          <Field label="Seats"><Input type="number" min="1" value={f.capacity} onChange={(e) => setF({ ...f, capacity: +e.target.value })} /></Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
            <Button type="submit" loading={create.isPending}>Schedule class</Button>
            <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
            <ErrorNote error={create.error} />
          </div>
        </form>
      )}
    </Card>
  );
}
