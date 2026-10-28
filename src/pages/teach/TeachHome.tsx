import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { date, money } from "@/lib/format";
import { Badge, Button, Card, CardHeader, Empty, ErrorNote, Field, Input, PageHeader, Select, Spinner, StatusBadge, Table, Td } from "@/components/ui";

interface TeachCourse { id: string; slug: string; title: string; status: string; priceMinor: number; currency: string; updatedAt: string; tenant: string; instructor: string; hasDraftChanges: boolean; learners: number }
interface Teaching { courses: { id: string; title: string; enrollments: number; completions: number; avgScore?: number; grossSalesMinor: number }[] }

export function TeachHome() {
  const { me } = useAuth();
  const navigate = useNavigate();
  const courses = useQuery({ queryKey: ["teach-courses"], queryFn: () => api<TeachCourse[]>("/teach/courses") });
  const stats = useQuery({ queryKey: ["teaching-stats"], queryFn: () => api<Teaching>("/analytics/teaching") });
  const tenants = me?.tenants.filter((t) => t.permissions.includes("course.create") && t.kind !== "Platform") ?? [];
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", summary: "", category: "", price: "0", tenantId: tenants[0]?.id ?? "" });

  const create = useMutation({
    mutationFn: () => post<{ id: string }>("/courses", {
      tenantId: form.tenantId || tenants[0]?.id,
      title: form.title,
      summary: form.summary,
      category: form.category,
      priceMinor: Math.round(parseFloat(form.price || "0") * 100),
    }),
    onSuccess: (c) => navigate(`/teach/courses/${c.id}`),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(); };
  const statFor = (id: string) => stats.data?.courses.find((c) => c.id === id);

  return (
    <div>
      <PageHeader eyebrow="Teaching" title="Teaching Studio" subtitle="Build courses, plan syllabi and milestones, run live classes and track how learners are doing." action={
        tenants.length > 0 && <Button onClick={() => setShowNew(!showNew)}><Plus className="h-4 w-4" aria-hidden /> New course</Button>
      } />

      {showNew && (
        <Card className="mb-6">
          <CardHeader title="New course" subtitle="You can add lessons and assessments next. Nothing is visible to learners until you publish." />
          <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Title"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="One-line summary"><Input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field></div>
            <Field label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Data & Analytics" /></Field>
            <Field label="Price (₹, GST inclusive)" hint="0 for a free course"><Input type="number" min="0" step="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
            {tenants.length > 1 && (
              <Field label="Publish under">
                <Select value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}>
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </Field>
            )}
            <div className="flex items-center gap-3 sm:col-span-2">
              <Button type="submit" loading={create.isPending}>Create draft</Button>
              <ErrorNote error={create.error} />
            </div>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader title="Your courses" />
        {courses.isLoading ? <Spinner /> : !courses.data?.length ? (
          <Empty title="No courses yet">Create your first course to get started.</Empty>
        ) : (
          <Table head={["Course", "Status", "Price", "Learners", "Completion", "Avg score", "Gross sales", "Updated"]}>
            {courses.data.map((c) => {
              const s = statFor(c.id);
              return (
                <tr key={c.id}>
                  <Td>
                    <Link to={`/teach/courses/${c.id}`} className="font-medium text-ink hover:text-brand-700">{c.title}</Link>
                    <div className="text-xs text-ink-mute">{c.tenant}{c.instructor !== me?.fullName && ` · ${c.instructor}`}</div>
                  </Td>
                  <Td><div className="flex flex-wrap gap-1"><StatusBadge status={c.status} />{c.hasDraftChanges && <Badge tone="amber">Unpublished edits</Badge>}</div></Td>
                  <Td className="tabular-nums">{c.priceMinor ? money(c.priceMinor, c.currency) : "Free"}</Td>
                  <Td className="tabular-nums">{c.learners}</Td>
                  <Td className="tabular-nums">{s && s.enrollments ? `${Math.round((s.completions / s.enrollments) * 100)}%` : "—"}</Td>
                  <Td className="tabular-nums">{s?.avgScore != null ? `${Math.round(s.avgScore)}%` : "—"}</Td>
                  <Td className="tabular-nums">{s ? money(s.grossSalesMinor) : "—"}</Td>
                  <Td className="text-ink-mute">{date(c.updatedAt)}</Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}
