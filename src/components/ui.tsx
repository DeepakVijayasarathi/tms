import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Loader2, Search, type LucideIcon } from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";
const variants: Record<Variant, string> = {
  primary: "bg-brand-500 text-white shadow-sm hover:bg-brand-600 disabled:bg-brand-300",
  secondary: "bg-white text-ink border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:text-slate-400",
  ghost: "text-ink-soft hover:bg-slate-100",
  danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
  dark: "bg-navy text-white hover:bg-navy-800 disabled:opacity-60",
};
const sizes = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm", lg: "h-11 px-5 text-[15px]" };

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; size?: keyof typeof sizes }>(
  ({ variant = "primary", loading, size = "md", className, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed",
        sizes[size],
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl border border-slate-200/80 bg-white shadow-card", className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action, icon: Icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pt-5">
      <div className="flex items-start gap-3">
        {Icon && <IconTile icon={Icon} />}
        <div>
          <h2 className="font-display text-[17px] font-bold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-mute">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const tileTones = {
  brand: "bg-brand-50 text-brand-600",
  sky: "bg-sky-50 text-sky-600",
  green: "bg-emerald-50 text-emerald-600",
  violet: "bg-violet-50 text-violet-600",
  pink: "bg-pink-50 text-pink-600",
  amber: "bg-amber-50 text-amber-600",
  slate: "bg-slate-100 text-slate-600",
  red: "bg-red-50 text-red-600",
};
export type TileTone = keyof typeof tileTones;

/** Rounded tinted square holding an icon — used on table rows, list items and card headers. */
export function IconTile({ icon: Icon, tone = "brand", size = "md", className }: { icon: LucideIcon; tone?: TileTone; size?: "sm" | "md" | "lg"; className?: string }) {
  const box = { sm: "h-8 w-8 rounded-lg", md: "h-10 w-10 rounded-xl", lg: "h-12 w-12 rounded-full" }[size];
  return (
    <span className={cx("flex shrink-0 items-center justify-center", box, tileTones[tone], className)}>
      <Icon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} aria-hidden />
    </span>
  );
}

const field = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-400 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...rest }, ref) => (
  <input ref={ref} className={cx(field, className)} {...rest} />
));

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...rest }, ref) => (
  <textarea ref={ref} className={cx(field, "min-h-24", className)} {...rest} />
));

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  // Full width by default; a width class passed in (e.g. w-auto) replaces it rather than fighting it.
  const width = className?.match(/(^|\s)w-/) ? "" : "w-full";
  return <select className={cx(field.replace("w-full ", ""), width, "pr-8", className)} {...rest} />;
}

export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={cx("relative w-full max-w-md", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={cx(field, "pl-10")} />
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-mute">{hint}</span>}
    </label>
  );
}

const tones = {
  gray: "bg-slate-100 text-slate-700",
  blue: "bg-brand-50 text-brand-800",
  sky: "bg-sky-50 text-sky-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  violet: "bg-violet-50 text-violet-700",
  live: "bg-red-600 text-white",
};
export type Tone = keyof typeof tones;

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: Tone }) {
  return <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}

/** Pulsing red "Live" pill used wherever a class is in progress. */
export function LiveBadge({ label = "Live" }: { label?: string }) {
  return (
    <Badge tone="live">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-live-ping rounded-full bg-white" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      {label}
    </Badge>
  );
}

// Status pills: soft background, coloured dot, dark label — the Meet to Manage style.
const dotTones = {
  amber: ["bg-amber-50", "bg-amber-500"], green: ["bg-emerald-50", "bg-emerald-500"], red: ["bg-red-50", "bg-red-500"],
  gray: ["bg-slate-100", "bg-slate-400"], sky: ["bg-sky-50", "bg-sky-500"], violet: ["bg-violet-50", "bg-violet-500"],
  pink: ["bg-pink-50", "bg-pink-500"], brand: ["bg-brand-50", "bg-brand-500"],
} as const;
type DotTone = keyof typeof dotTones;
const statusTones: Record<string, DotTone> = {
  Pending: "amber", Requested: "amber", InProgress: "amber", Draft: "amber", Scheduled: "amber", Registered: "sky", Due: "amber",
  Approved: "sky", Payable: "violet", Active: "green", Published: "green", Paid: "green", Completed: "green", valid: "green", Fulfilled: "green",
  Present: "green", Ended: "green", Achieved: "green",
  Reversed: "gray", Refunded: "gray", Upcoming: "gray", Archived: "gray", Expired: "gray",
  Rejected: "red", Revoked: "red", revoked: "red", Failed: "red", Absent: "red", Cancelled: "red", Overdue: "red",
  PartiallyRefunded: "amber", expired: "amber",
};
export function DotBadge({ children, tone = "gray" }: { children: ReactNode; tone?: DotTone }) {
  const [bg, dot] = dotTones[tone];
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold text-ink-soft", bg)}>
      <span className={cx("h-1.5 w-1.5 rounded-full", dot)} aria-hidden />{children}
    </span>
  );
}
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  if (status === "Live") return <LiveBadge />;
  const text = label ?? (status === "Ended" ? "Completed" : status === "Expired" ? "Not held" : status.replace(/([a-z])([A-Z])/g, "$1 $2"));
  return <DotBadge tone={statusTones[status] ?? "gray"}>{text}</DotBadge>;
}

export function Stat({ label, value, hint, icon: Icon, tone = "brand", trend }: {
  label: string; value: ReactNode; hint?: ReactNode; icon?: LucideIcon; tone?: TileTone;
  trend?: { value: string; label: string; down?: boolean };
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-ink-soft">{label}</div>
          <div className="mt-1.5 font-display text-[26px] font-bold leading-tight tabular-nums text-ink">{value}</div>
        </div>
        {Icon && <IconTile icon={Icon} tone={tone} size="lg" />}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className={cx("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold", trend.down ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700")}>
            {trend.down ? <ArrowDownRight className="h-3 w-3" aria-hidden /> : <ArrowUpRight className="h-3 w-3" aria-hidden />}{trend.value}
          </span>
          <span className="text-ink-mute">{trend.label}</span>
        </div>
      )}
      {hint && <div className="mt-2 text-xs text-ink-mute">{hint}</div>}
    </Card>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-ink-mute" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-brand-500" aria-hidden /> {label}…
    </div>
  );
}

export function Empty({ title, children, icon: Icon }: { title: string; children?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {Icon && <IconTile icon={Icon} size="lg" className="mb-3" />}
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 text-sm text-ink-mute">{children}</div>}
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
      {error instanceof Error ? error.message : String(error)}
    </div>
  );
}

/** Small uppercase tag above a page title ("• OVERVIEW"). */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-600">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />{children}
    </span>
  );
}

export function PageHeader({ title, subtitle, action, eyebrow }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className={cx("font-display text-[28px] font-bold leading-tight tracking-tight text-ink", eyebrow && "mt-3")}>{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-ink-mute">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-[13px] text-ink-soft">
          <tr>{head.map((h, i) => <th key={i} className="whitespace-nowrap px-5 py-3.5 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx("px-5 py-3.5 align-middle", className)}>{children}</td>;
}

/** "Showing 1–8 of 25" with page arrows, under a table card. */
export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const arrow = "flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-ink-soft hover:bg-slate-50 disabled:opacity-40";
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-ink-mute">
      <span>Showing {from}–{to} of {total}</span>
      <div className="flex items-center gap-2">
        <button className={arrow} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-ink-soft">Page {page} / {pages}</span>
        <button className={arrow} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

/** Underlined tab strip used by the editor and course pages. */
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
      {items.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
            value === t.value ? "border-brand-500 text-brand-700" : "border-transparent text-ink-mute hover:text-ink",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Pill-shaped toggle ("List | Calendar"). */
export function Segmented<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; icon?: LucideIcon }[] }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist">
      {items.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx("flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors", value === t.value ? "bg-white text-ink shadow-sm" : "text-ink-mute hover:text-ink")}
        >
          {t.icon && <t.icon className="h-4 w-4" aria-hidden />}{t.label}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && !w.endsWith(".")).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
  return (
    <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700", className)} aria-hidden>
      {initials}
    </span>
  );
}
