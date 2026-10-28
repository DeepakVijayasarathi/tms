import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Award, BadgeCheck, BookOpen, Building2, Handshake, Users } from "lucide-react";
import { api, patch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { Badge, Button, Card, Empty, ErrorNote, IconTile, PageHeader, Spinner } from "@/components/ui";

interface Partner {
  id: string; name: string; slug: string; kind: string; brandColor?: string; isVerified: boolean; createdAt: string;
  courses: { id: string; slug: string; title: string; summary: string; category: string; priceMinor: number; currency: string }[];
  learners: number; certificatesIssued: number;
}

const STEPS = [
  { icon: Building2, title: "Register your company", text: "Sign up as a company partner. Your team gets its own studio." },
  { icon: BookOpen, title: "Publish your courses", text: "Build lessons, live classes and assessments, then publish to the catalog." },
  { icon: Award, title: "Certify in your name", text: "Learners earn verifiable certificates issued by your company, co-branded with TMS Learning." },
];

/** Vendor partners: companies that collaborate by providing courses and issuing certificates. */
export function Partners() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const staff = !!me?.isPlatformStaff;
  const partners = useQuery({ queryKey: ["partners", staff], queryFn: () => api<Partner[]>(`/partners${staff ? "?all=true" : ""}`) });
  const verify = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) => patch(`/partners/${id}/verify`, { verified }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partners"] }),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Partners"
        title="Learn from companies that hire"
        subtitle="Partner companies publish their own courses on TMS Learning and certify learners in their name."
        action={!me && <Link to="/register?type=company"><Button><Handshake className="h-4 w-4" aria-hidden /> Become a partner</Button></Link>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <Card key={s.title} className="p-5">
            <IconTile icon={s.icon} tone="brand" />
            <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-mute">Step {i + 1}</div>
            <h3 className="mt-1 font-display text-lg font-bold text-ink">{s.title}</h3>
            <p className="mt-1 text-sm text-ink-mute">{s.text}</p>
          </Card>
        ))}
      </div>

      <ErrorNote error={partners.error ?? verify.error} />
      {partners.isLoading ? <Spinner /> : !partners.data?.length ? (
        <Empty icon={Handshake} title="No partners listed yet">Companies appear here once verified and their first course is published.</Empty>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {partners.data.map((p) => (
            <Card key={p.id} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white" style={{ backgroundColor: p.brandColor ?? "#334155" }} aria-hidden>
                  {p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="flex items-center gap-1.5 font-display text-xl font-bold text-ink">
                    {p.name}{p.isVerified && <BadgeCheck className="h-5 w-5 text-emerald-600" aria-label="Verified partner" />}
                  </h2>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-ink-mute">
                    <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" aria-hidden />{p.courses.length} course{p.courses.length === 1 ? "" : "s"}</span>
                    <span className="flex items-center gap-1"><Users className="h-4 w-4" aria-hidden />{p.learners} learners</span>
                    <span className="flex items-center gap-1"><Award className="h-4 w-4" aria-hidden />{p.certificatesIssued} certificates</span>
                  </div>
                </div>
                {staff && (
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge tone={p.isVerified ? "green" : "amber"}>{p.isVerified ? "Verified" : "Pending"}</Badge>
                    <Button size="sm" variant="secondary" loading={verify.isPending && verify.variables?.id === p.id} onClick={() => verify.mutate({ id: p.id, verified: !p.isVerified })}>
                      {p.isVerified ? "Unverify" : "Verify"}
                    </Button>
                  </div>
                )}
              </div>
              <ul className="mt-4 flex-1 divide-y divide-slate-100">
                {p.courses.map((c) => (
                  <li key={c.id}>
                    <Link to={`/courses/${c.slug}`} className="flex items-center gap-3 py-2.5 hover:text-brand-700">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{c.title}</div>
                        <div className="truncate text-xs text-ink-mute">{c.category}</div>
                      </div>
                      <span className="text-sm font-semibold">{c.priceMinor === 0 ? "Free" : money(c.priceMinor, c.currency)}</span>
                      <ArrowRight className="h-4 w-4 text-slate-300" aria-hidden />
                    </Link>
                  </li>
                ))}
                {!p.courses.length && <li className="py-2.5 text-sm text-ink-mute">No published courses yet.</li>}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {!me && (
        <Card className="flex flex-wrap items-center gap-4 p-6">
          <IconTile icon={Handshake} tone="brand" size="lg" />
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold text-ink">Is your company training people already?</h3>
            <p className="text-sm text-ink-mute">Bring your courses here, reach more learners, and issue certificates under your brand.</p>
          </div>
          <Link to="/register?type=company"><Button>Become a partner <ArrowRight className="h-4 w-4" aria-hidden /></Button></Link>
        </Card>
      )}
    </div>
  );
}
