import { Link } from "react-router-dom";
import { CalendarClock, Video } from "lucide-react";
import { canEnter, displayStatus, durationMinutes, relative, toDate, useNow, type ClassItem } from "@/lib/classes";
import { minutes } from "@/lib/format";
import { Badge, IconTile, StatusBadge, cx } from "./ui";

/** Join/start/view action for a class, shared by rows, tables and the calendar. */
export function ClassAction({ c, size = "md" }: { c: ClassItem; size?: "sm" | "md" }) {
  const now = useNow();
  const pad = size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-4 py-2 text-sm";
  if (c.status === "Ended" || c.status === "Cancelled" || displayStatus(c, now) === "Expired") {
    return <Link to={`/classes/${c.id}/room`} className={cx("whitespace-nowrap rounded-xl border border-slate-200 bg-white font-semibold text-ink-soft hover:bg-slate-50", pad)}>{c.status === "Ended" ? "View record" : "Details"}</Link>;
  }
  if (canEnter(c, now)) {
    return (
      <Link to={`/classes/${c.id}/room`} className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl font-semibold text-white shadow-sm", pad, c.status === "Live" ? "bg-red-600 hover:bg-red-700" : "bg-brand-500 hover:bg-brand-600")}>
        <Video className="h-4 w-4" aria-hidden />{c.isHost ? (c.status === "Live" ? "Rejoin Class" : "Start Class") : "Join Class"}
      </Link>
    );
  }
  return (
    <span className="flex flex-col items-end gap-0.5">
      <Link to={`/classes/${c.id}/room`} className={cx("rounded-xl border border-slate-200 bg-white font-semibold text-ink-soft hover:bg-slate-50", pad)}>View</Link>
      <span className="text-[11px] text-ink-mute">Starts {relative(c.startsAt, now)}</span>
    </span>
  );
}

/** One class as a bordered row: icon tile, title, meta line, status and action. */
export function ClassRow({ c, showDate = false }: { c: ClassItem; showDate?: boolean }) {
  const start = toDate(c.startsAt);
  const when = [
    showDate && start.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }),
    start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    minutes(durationMinutes(c.startsAt, c.endsAt)),
  ].filter(Boolean).join(" · ");
  return (
    <div className={cx("flex flex-wrap items-center gap-4 rounded-2xl border bg-white px-4 py-3.5", c.status === "Live" ? "border-red-200 ring-1 ring-red-100" : "border-slate-200")}>
      <IconTile icon={CalendarClock} tone={c.status === "Live" ? "red" : c.isHost ? "brand" : "sky"} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-ink">{c.title}</div>
        <div className="truncate text-[13px] text-ink-mute">{c.course.title} · {when}{!c.isHost && c.instructor ? ` · ${c.instructor}` : ""}</div>
      </div>
      <div className="flex items-center gap-2">
        {c.isHost && <Badge tone="violet">Host</Badge>}
        {!c.isHost && c.myStatus === "Present" && c.status !== "Scheduled" ? <StatusBadge status="Present" /> : <StatusBadge status={displayStatus(c)} />}
        <ClassAction c={c} size="sm" />
      </div>
    </div>
  );
}
