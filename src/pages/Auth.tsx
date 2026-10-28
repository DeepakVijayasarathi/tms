import { forwardRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle, ArrowRight, Award, BookOpen, Building2, Eye, EyeOff, GraduationCap, Handshake, Landmark, Loader2, Lock, Mail,
  Presentation, ShieldCheck, Sparkles, User, Wallet, type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cx } from "@/components/ui";
import { INTEREST_CHAT_LINK } from "@/components/Interests";

const DEMO_PASSWORD = "Passw0rd!";
const DEMO: { email: string; role: string; icon: LucideIcon; hex: string }[] = [
  { email: "learner@tms.local", role: "Learner", icon: GraduationCap, hex: "#2563eb" },
  { email: "prof@tms.local", role: "Professor", icon: Presentation, hex: "#7c3aed" },
  { email: "college@tms.local", role: "College admin", icon: Building2, hex: "#0891b2" },
  { email: "vendor@tms.local", role: "Vendor partner", icon: Handshake, hex: "#0d9488" },
  { email: "affiliate@tms.local", role: "Affiliate", icon: Sparkles, hex: "#db2777" },
  { email: "finance@tms.local", role: "Finance admin", icon: Landmark, hex: "#16a34a" },
  { email: "admin@tms.local", role: "Super admin", icon: ShieldCheck, hex: "#ea580c" },
];

const FEATURES: { icon: LucideIcon; label: string }[] = [
  { icon: BookOpen, label: "Courses" },
  { icon: Award, label: "Certificates" },
  { icon: Wallet, label: "Earnings" },
];

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState<string | null>(null);

  const signIn = async (mail: string, pass: string) => {
    setBusy(true);
    setError(null);
    try {
      await login(mail, pass);
      navigate(params.get("next") ?? "/dashboard", { replace: true });
    } catch (err) {
      setError(err);
      setPassword("");
      document.getElementById("password")?.focus();
    } finally {
      setBusy(false);
      setDemoBusy(null);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void signIn(email.trim(), password);
  };

  const pickDemo = (mail: string) => {
    setEmail(mail);
    setPassword(DEMO_PASSWORD);
    setDemoBusy(mail);
    void signIn(mail, DEMO_PASSWORD);
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your account and continue learning"
      footer={<>New here? <Link to={params.has("next") ? `/register?next=${encodeURIComponent(params.get("next")!)}` : "/register"} className="font-semibold text-brand-700 hover:underline">Create an account</Link></>}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <AuthField label="Email" htmlFor="email">
          <IconInput id="email" icon={Mail} type="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </AuthField>
        <AuthField label="Password" htmlFor="password">
          <PasswordInput id="password" autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </AuthField>

        {import.meta.env.DEV && (
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy/70">
              <Sparkles className="h-3 w-3 text-amber-500" aria-hidden /> Demo accounts — tap to sign in
            </span>
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-xl border border-slate-200 p-1.5">
              {DEMO.map((d) => {
                const Icon = d.icon;
                const active = email === d.email;
                return (
                  <button
                    key={d.email}
                    type="button"
                    disabled={busy}
                    onClick={() => pickDemo(d.email)}
                    className={cx(
                      "flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-60",
                      active && "bg-brand-50 ring-1 ring-brand-400/50",
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${d.hex}1A`, color: d.hex }}>
                      {demoBusy === d.email ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-navy">{d.role}</span>
                      <span className="block truncate font-mono text-xs text-ink-mute">{d.email}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-ink-mute">All demo accounts use password <span className="font-mono">{DEMO_PASSWORD}</span></p>
          </div>
        )}

        <AuthError error={error} />
        <SubmitButton busy={busy} busyLabel="Signing in…">Sign in</SubmitButton>
      </form>
    </AuthShell>
  );
}

/** Only follow same-site paths from ?next=, never another origin. */
const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : null);

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [form, setForm] = useState({ fullName: "", email: "", password: "", accountType: params.get("type") ?? "learner", organizationName: "" });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({ ...form, organizationName: form.organizationName || undefined });
      // New learners go straight into the interest chat so their first recommendations are personal.
      navigate(form.accountType === "learner" ? next ?? INTEREST_CHAT_LINK : form.accountType === "college" ? "/org" : "/teach", { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const types: { value: string; label: string; hint: string; icon: LucideIcon }[] = [
    { value: "learner", label: "Learner", hint: "Take courses and earn certificates", icon: GraduationCap },
    { value: "professor", label: "Professor / trainer", hint: "Publish courses and earn commission", icon: Presentation },
    { value: "company", label: "Company / vendor partner", hint: "Offer your courses and issue certificates in your name", icon: Handshake },
    { value: "college", label: "College or institute", hint: "Run a branded catalog for your students", icon: Building2 },
  ];

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join in a minute — no card required"
      footer={<>Already registered? <Link to={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-brand-700 hover:underline">Sign in</Link></>}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-navy/70">I am joining as</legend>
          <div className="flex flex-col gap-2">
            {types.map((t) => {
              const Icon = t.icon;
              const active = form.accountType === t.value;
              return (
                <label
                  key={t.value}
                  className={cx(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400",
                    active ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  <input type="radio" name="type" value={t.value} checked={active} onChange={set("accountType")} className="sr-only" />
                  <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", active ? "bg-brand-600 text-white" : "bg-slate-100 text-ink-soft")}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-navy">{t.label}</span>
                    <span className="block text-xs text-ink-mute">{t.hint}</span>
                  </span>
                  <span className={cx("h-4 w-4 shrink-0 rounded-full border-2", active ? "border-brand-600 bg-brand-600 shadow-[inset_0_0_0_2px_#fff]" : "border-slate-300")} aria-hidden />
                </label>
              );
            })}
          </div>
        </fieldset>
        <AuthField label="Full name" htmlFor="fullName">
          <IconInput id="fullName" icon={User} required value={form.fullName} onChange={set("fullName")} autoComplete="name" placeholder="Your name" />
        </AuthField>
        {form.accountType !== "learner" && (
          <AuthField label={form.accountType === "college" ? "College name" : form.accountType === "company" ? "Company name" : "Academy name (optional)"} htmlFor="org">
            <IconInput id="org" icon={Building2} required={form.accountType === "college" || form.accountType === "company"} value={form.organizationName} onChange={set("organizationName")} />
          </AuthField>
        )}
        <AuthField label="Email" htmlFor="email">
          <IconInput id="email" icon={Mail} type="email" required value={form.email} onChange={set("email")} autoComplete="email" placeholder="you@example.com" />
        </AuthField>
        <AuthField label="Password" htmlFor="password" hint="At least 8 characters">
          <PasswordInput id="password" required minLength={8} value={form.password} onChange={set("password")} autoComplete="new-password" placeholder="Create a password" />
        </AuthField>
        <AuthError error={error} />
        <SubmitButton busy={busy} busyLabel="Creating account…">Create account</SubmitButton>
      </form>
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, footer, children }: { title: string; subtitle: string; footer: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[3fr_2fr]">
      <HeroPanel />
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="flex flex-col items-center text-center">
            <Link to="/" className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-pop ring-1 ring-slate-900/10" aria-label="TMS Learning home">
              <img src="/logo-icon.png" alt="" className="h-11 w-11 object-contain" />
            </Link>
            <h1 className="mt-4 font-rounded text-3xl font-semibold tracking-tight text-navy">{title}</h1>
            <p className="mt-1.5 text-sm text-ink-mute">{subtitle}</p>
          </div>
          <div className="mt-8">{children}</div>
          <p className="mt-7 text-center text-sm text-ink-mute">{footer}</p>
          <p className="mt-8 text-center text-xs text-slate-400">
            Powered by <span className="font-semibold text-ink-mute">TMS Learning</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function HeroPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-navy lg:sticky lg:top-0 lg:block lg:h-screen">
      {/* glow + dot texture */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 85% 85%, rgb(255 98 3 / .40), transparent 50%), radial-gradient(circle at 10% 5%, rgb(254 150 3 / .22), transparent 45%)" }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(rgb(255 255 255) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      <Link to="/" className="absolute left-10 top-8 flex items-center gap-2 font-semibold text-white">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
          <img src="/logo-icon.png" alt="" className="h-full w-full object-contain" />
        </span>
        TMS Learning
      </Link>

      <div className="absolute right-10 top-20 flex flex-col gap-4">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={f.label} style={{ animationDelay: `${i * 90}ms` }} className="flex animate-slide-up items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-pop backdrop-blur transition-transform hover:-translate-y-0.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/15 text-brand-600">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-navy">{f.label}</span>
            </div>
          );
        })}
      </div>

      {/* illustrative course card */}
      <div className="absolute left-10 top-1/2 w-80 -translate-y-1/2 xl:left-16">
        <div className="animate-float rounded-2xl border border-white/10 bg-white/10 p-5 text-white shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-400/25 text-brand-400">
              <BookOpen className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold">Data Structures 101</p>
              <p className="text-xs text-white/60">Module 4 of 6 · Quizzes</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-brand-400 to-brand-600" />
          </div>
          <div className="mt-2 flex justify-between text-xs text-white/60">
            <span>Progress</span><span className="font-semibold text-white">68%</span>
          </div>
        </div>
        <div className="ml-24 mt-4 flex w-max items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-pop [animation-delay:1.5s] animate-float">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Award className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy">Certificate earned</p>
            <p className="text-xs text-ink-mute">Verified &amp; shareable</p>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 animate-slide-up p-12">
        <h2 className="font-rounded text-4xl font-bold leading-[1.1] text-white xl:text-5xl">
          Learn anything.<br />Certify everything.
        </h2>
        <p className="mt-4 max-w-md text-base text-white/80">
          Courses, quizzes, certificates and payouts in one focused workspace for learners, trainers and colleges.
        </p>
        <p className="mt-8 text-xs font-medium text-white/50">© {new Date().getFullYear()} TMS Learning</p>
      </div>
    </div>
  );
}

function AuthField({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-bold uppercase tracking-wide text-navy/70">{label}</label>
      {children}
      {hint && <span className="text-xs text-ink-mute">{hint}</span>}
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 text-sm text-navy transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

const IconInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { icon: LucideIcon }>(({ icon: Icon, className, ...rest }, ref) => (
  <div className="relative">
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
    <input ref={ref} className={cx(inputClass, "pr-3", className)} {...rest} />
  </div>
));

function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input {...props} type={show ? "text" : "password"} className={cx(inputClass, "pr-10")} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-slate-400 transition-colors hover:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SubmitButton({ busy, busyLabel, children }: { busy: boolean; busyLabel: string; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-400 to-brand-600 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition-all hover:from-brand-500 hover:to-brand-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {busyLabel}</> : <>{children} <ArrowRight className="h-4 w-4" /></>}
    </button>
  );
}

function AuthError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {error instanceof Error ? error.message : String(error)}
    </p>
  );
}
