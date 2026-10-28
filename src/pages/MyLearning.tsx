import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { api } from "@/lib/api";
import { date, money } from "@/lib/format";
import { Card, CardHeader, Empty, PageHeader, Progress, Spinner, StatusBadge, Table, Td } from "@/components/ui";

interface Enrollment {
  id: string;
  status: string;
  course: { id: string; slug: string; title: string; category: string; instructor: string };
  lessonsTotal: number;
  lessonsCompleted: number;
  certificateCode?: string;
}
interface Cert { id: string; credentialCode: string; courseTitle: string; issuerName: string; issuedAt: string; expiresAt?: string; status: string }
interface Order { id: string; status: string; totalMinor: number; refundedMinor: number; currency: string; createdAt: string; items: string[] }

export function MyLearning() {
  const enrollments = useQuery({ queryKey: ["enrollments"], queryFn: () => api<Enrollment[]>("/me/enrollments") });
  const certs = useQuery({ queryKey: ["certificates"], queryFn: () => api<Cert[]>("/me/certificates") });
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => api<Order[]>("/me/orders") });

  return (
    <div>
      <PageHeader eyebrow="Learning" title="My Learning" subtitle="Pick up where you left off — courses, certificates and purchases." />
      {enrollments.isLoading ? <Spinner /> : enrollments.data?.length === 0 ? (
        <Card><Empty title="You're not enrolled in any courses yet"><Link to="/courses" className="text-brand-700 hover:underline">Browse the catalog</Link></Empty></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {enrollments.data?.map((e) => {
            const pct = e.lessonsTotal ? (e.lessonsCompleted / e.lessonsTotal) * 100 : 0;
            return (
              <Link key={e.id} to={`/learn/${e.id}`}>
                <Card className="p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-ink">{e.course.title}</h3>
                      <p className="text-sm text-ink-mute">{e.course.instructor}</p>
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="mt-4"><Progress value={pct} /></div>
                  <p className="mt-2 text-xs text-ink-mute">{e.lessonsCompleted} of {e.lessonsTotal} lessons{e.certificateCode && " · certificate earned"}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Card className="mt-8">
        <CardHeader title="Certificates" subtitle="Each has a public verification page you can share." />
        {certs.data?.length ? (
          <ul className="divide-y divide-slate-100">
            {certs.data.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <Award className="h-8 w-8 text-amber-500" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink">{c.courseTitle}</div>
                  <div className="text-sm text-ink-mute">{c.issuerName} · issued {date(c.issuedAt)} · {c.credentialCode}</div>
                </div>
                <StatusBadge status={c.status} />
                <Link to={`/verify/${c.credentialCode}`} className="text-sm font-medium text-brand-700 hover:underline">View & share</Link>
              </li>
            ))}
          </ul>
        ) : <Empty title="No certificates yet">Complete a course to earn one.</Empty>}
      </Card>

      {!!orders.data?.length && (
        <Card className="mt-8">
          <CardHeader title="Purchases" />
          <Table head={["Course", "Date", "Amount", "Status"]}>
            {orders.data.map((o) => (
              <tr key={o.id}>
                <Td><Link to={`/orders/${o.id}`} className="hover:underline">{o.items.join(", ")}</Link></Td>
                <Td className="text-ink-mute">{date(o.createdAt)}</Td>
                <Td className="tabular-nums">{money(o.totalMinor, o.currency)}{o.refundedMinor > 0 && <span className="text-ink-mute"> (−{money(o.refundedMinor, o.currency)})</span>}</Td>
                <Td><StatusBadge status={o.status} /></Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}
