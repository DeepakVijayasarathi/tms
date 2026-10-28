import { useEffect, useRef, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen, Building2, Handshake, Rocket, Trophy, Zap, ChevronsLeft, ChevronsRight, GraduationCap, LayoutDashboard, LogOut, Menu, Presentation, ShieldCheck, Video, Wallet, Wifi, X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { Me } from "@/lib/types";
import { canEnter, useMyClasses } from "@/lib/classes";
import { levelPercent, useProgress } from "@/lib/gamification";
import { Avatar, cx } from "./ui";
import { NotificationBell } from "./Notifications";

// Each nav item gets its own hue, like the Meet to Manage portals.
const hues = {
  sky: "bg-sky-500/15 text-sky-300", orange: "bg-orange-500/15 text-orange-300", green: "bg-emerald-500/15 text-emerald-300",
  red: "bg-rose-500/15 text-rose-300", violet: "bg-violet-500/15 text-violet-300", amber: "bg-amber-500/15 text-amber-300",
  teal: "bg-teal-500/15 text-teal-300", indigo: "bg-indigo-500/15 text-indigo-300",
};
interface NavItem { to: string; label: string; icon: LucideIcon; hue: keyof typeof hues; show: boolean; end?: boolean; badge?: number }

export function portalName(me: Me | null | undefined, can: (p: string) => boolean) {
  if (!me) return "Learning Portal";
  if (me.isPlatformStaff) return "Admin Portal";
  if (me.tenants.some((t) => t.kind !== "Platform" && t.permissions.includes("members.manage"))) return "College Portal";
  if (can("course.create")) return "Teacher Portal";
  return "Learner Portal";
}

const COLLAPSE_KEY = "tms.sidebar.collapsed";

export function Layout() {
  const { me, logout, can } = useAuth();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; } });
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const classes = useMyClasses("upcoming", !!me);
  const live = classes.data?.filter((c) => canEnter(c)) ?? [];
  const portal = portalName(me, can);
  const progress = useProgress(!!me);

  useEffect(() => { setOpen(false); setMenu(false); }, [location.pathname]);
  useEffect(() => { try { localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0"); } catch { /* per-viewer convenience only */ } }, [collapsed]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  const groups: { title?: string; items: NavItem[] }[] = [
    {
      items: [
        { to: me ? "/dashboard" : "/", label: "Dashboard", icon: LayoutDashboard, hue: "sky", show: !!me },
      ],
    },
    {
      title: "Learning",
      items: [
        { to: "/courses", label: "Course Catalog", icon: BookOpen, hue: "green", show: true, end: true },
        { to: "/careers", label: "Meet to Career", icon: Rocket, hue: "orange", show: true },
        { to: "/partners", label: "Partners", icon: Handshake, hue: "teal", show: true },
        { to: "/learn", label: "My Learning", icon: GraduationCap, hue: "violet", show: !!me },
        { to: "/classes", label: "Live Classes", icon: Video, hue: "red", show: !!me, badge: live.length },
        { to: "/progress", label: "Progress & Badges", icon: Trophy, hue: "amber", show: !!me },
      ],
    },
    {
      title: "Teaching",
      items: [
        { to: "/teach", label: "Teaching Studio", icon: Presentation, hue: "orange", show: can("course.create") },
      ],
    },
    {
      title: "Manage",
      items: [
        { to: "/org", label: "Organization", icon: Building2, hue: "teal", show: !!me?.tenants.some((t) => t.kind !== "Platform" && t.permissions.includes("members.manage")) },
        { to: "/earnings", label: "Earnings & Payouts", icon: Wallet, hue: "amber", show: !!me },
        { to: "/admin", label: "Platform Admin", icon: ShieldCheck, hue: "indigo", show: !!me?.isPlatformStaff },
      ],
    },
  ];

  const sidebar = (mobile: boolean) => {
    const slim = collapsed && !mobile;
    return (
      <div className="flex h-full flex-col bg-navy text-white">
        <div className={cx("flex items-center gap-3 pb-4 pt-5", slim ? "justify-center px-3" : "px-5")}>
          <Link to={me ? "/dashboard" : "/"} className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
              <img src="/logo-icon.png" alt="" className="h-full w-full object-contain" />
            </span>
            {!slim && <span className="font-display text-[17px] font-bold tracking-tight">TMS Learning</span>}
          </Link>
        </div>
        {!slim && (
          <div className="mx-4 mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] font-semibold">
            <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden />{portal}
          </div>
        )}

        <nav className={cx("flex-1 space-y-5 overflow-y-auto pb-4", slim ? "px-2" : "px-3")} aria-label="Main">
          {groups.map((g, i) => {
            const items = g.items.filter((n) => n.show);
            if (!items.length) return null;
            return (
              <div key={i}>
                {g.title && !slim && <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-white/45">{g.title}</p>}
                <ul className="space-y-1">
                  {items.map((n) => (
                    <li key={n.label}>
                      <NavLink
                        to={n.to}
                        end={n.end}
                        title={slim ? n.label : undefined}
                        className={({ isActive }) => cx(
                          "group relative flex items-center gap-3 rounded-xl py-2 text-[15px] font-medium transition-colors",
                          slim ? "justify-center px-2" : "px-3",
                          isActive ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25" : "text-white/80 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        {({ isActive }) => (
                          <>
                            <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", isActive ? "bg-white/20 text-white" : hues[n.hue])}>
                              <n.icon className="h-[17px] w-[17px]" aria-hidden />
                            </span>
                            {!slim && <span className="flex-1 truncate">{n.label}</span>}
                            {!!n.badge && (
                              <span className={cx(
                                "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                                isActive ? "bg-white text-brand-600" : "bg-red-600 text-white",
                                slim && "absolute right-0.5 top-0.5",
                              )}>{n.badge}</span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        {!me && !slim && (
          <div className="flex flex-col gap-2 p-4">
            <Link to="/register" className="rounded-xl bg-brand-500 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600">Get started</Link>
            <Link to="/login" className="rounded-xl px-3 py-2.5 text-center text-sm font-semibold text-white/80 hover:bg-white/10">Sign in</Link>
          </div>
        )}
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cx("flex items-center gap-2 border-t border-white/10 py-4 text-[13px] font-semibold text-white/70 hover:text-white", slim ? "justify-center" : "px-6")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" />Collapse</>}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={cx("min-h-screen transition-[padding]", collapsed ? "lg:pl-20" : "lg:pl-72")}>
      <aside className={cx("fixed inset-y-0 left-0 z-40 hidden transition-[width] lg:block", collapsed ? "w-20" : "w-72")}>{sidebar(false)}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] animate-fade-in shadow-2xl">{sidebar(true)}</div>
          <button className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
        <button className="-ml-1 rounded-lg p-2 text-ink-soft hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-[15px] font-medium text-ink-soft">{portal}</span>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {live[0] && (
            <Link
              to={`/classes/${live[0].id}/room`}
              className="hidden items-center gap-2 rounded-full bg-red-50 py-1.5 pl-2.5 pr-3.5 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition-colors hover:bg-red-100 md:flex"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-live-ping rounded-full bg-red-500" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
              </span>
              <span className="max-w-[14rem] truncate">{live[0].isHost ? (live[0].status === "Live" ? "Your class is live" : "Start your class") : "Class open"} · {live[0].title}</span>
            </Link>
          )}
          {progress.data && (
            <Link to="/progress" className="hidden items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-[13px] font-semibold text-ink transition-colors hover:border-brand-200 hover:bg-brand-50 sm:flex" title={`${progress.data.xp} XP · ${progress.data.level.title}`}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white">{progress.data.level.number}</span>
              <span className="flex flex-col leading-tight">
                <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-brand-500" aria-hidden />{progress.data.xp.toLocaleString()} XP</span>
                <span className="mt-0.5 h-1 w-16 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-brand-500" style={{ width: `${levelPercent(progress.data.xp, progress.data.level)}%` }} /></span>
              </span>
            </Link>
          )}
          <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-emerald-600 xl:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /><Wifi className="h-3.5 w-3.5" aria-hidden />Online
          </span>
          {me ? (
            <>
              <NotificationBell />
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenu(!menu)} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400" aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu">
                  <Avatar name={me.fullName} className="h-10 w-10" />
                </button>
                {menu && (
                  <div className="absolute right-0 mt-2 w-64 animate-fade-in rounded-2xl border border-slate-200 bg-white p-2 shadow-pop" role="menu">
                    <div className="flex items-center gap-3 border-b border-slate-100 px-2 pb-3 pt-1">
                      <Avatar name={me.fullName} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">{me.fullName}</div>
                        <div className="truncate text-xs text-ink-mute">{me.email}</div>
                      </div>
                    </div>
                    <Link to="/dashboard" role="menuitem" className="mt-1 flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink-soft hover:bg-slate-50"><LayoutDashboard className="h-4 w-4" />Dashboard</Link>
                    <button role="menuitem" onClick={() => { logout(); navigate("/"); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Sign out</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-slate-100">Sign in</Link>
              <Link to="/register" className="rounded-xl bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600">Get started</Link>
            </>
          )}
        </div>
      </header>

      <main className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72" style={{ background: "radial-gradient(ellipse at 70% 0%, rgb(255 122 3 / .07), transparent 60%)" }} aria-hidden />
        <div className="relative mx-auto max-w-[1400px] px-4 py-7 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!me) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}
