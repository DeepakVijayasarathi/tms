import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { date } from "@/lib/format";
import { Badge, Button, Card, CardHeader, Empty, ErrorNote, Field, Input, PageHeader, Select, Stat, StatusBadge, Table, Td } from "@/components/ui";

interface TenantStats {
  members: number;
  faculty: number;
  courses: number;
  published: number;
  enrollments: number;
  completions: number;
  certificates: number;
  courseBreakdown: { title: string; status: string; instructor: string; enrollments: number; completions: number }[];
}
interface Member { userId: string; fullName: string; email: string; roles: string[] }
interface Cert { id: string; credentialCode: string; recipientName: string; courseTitle: string; issuedAt: string; status: string; revokedReason?: string }

export function Organization() {
  const { me } = useAuth();
  const tenants = me?.tenants.filter((t) => t.kind !== "Platform" && t.permissions.includes("members.manage")) ?? [];
  const [tenantId, setTenantId] = useState(tenants[0]?.id);
  const tenant = tenants.find((t) => t.id === tenantId);
  if (!tenant) return <Empty title="You don't administer an organization" />;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Organization"
        title={tenant.name}
        subtitle={`${tenant.kind === "College" ? "College" : "Organization"} workspace — data here is visible only to this organization's administrators.`}
        action={tenants.length > 1 && (
          <Select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="w-auto">
            {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        )}
      />
      <Overview tenantId={tenant.id} />
      <Members tenantId={tenant.id} kind={tenant.kind} />
      <Certificates tenantId={tenant.id} />
    </div>
  );
}

function Overview({ tenantId }: { tenantId: string }) {
  const stats = useQuery({ queryKey: ["tenant-stats", tenantId], queryFn: () => api<TenantStats>(`/analytics/tenants/${tenantId}`) });
  const s = stats.data;
  if (!s) return <ErrorNote error={stats.error} />;
  const rate = s.enrollments ? Math.round((s.completions / s.enrollments) * 100) : 0;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Members" value={s.members} hint={`${s.faculty} faculty`} />
        <Stat label="Courses" value={s.courses} hint={`${s.published} published`} />
        <Stat label="Enrollments" value={s.enrollments} hint={`${rate}% completed`} />
        <Stat label="Certificates issued" value={s.certificates} />
      </div>
      <Card>
        <CardHeader title="Course performance" />
        <Table head={["Course", "Instructor", "Status", "Enrolled", "Completed"]}>
          {s.courseBreakdown.map((c) => (
            <tr key={c.title}>
              <Td className="font-medium">{c.title}</Td>
              <Td>{c.instructor}</Td>
              <Td><StatusBadge status={c.status} /></Td>
              <Td className="tabular-nums">{c.enrollments}</Td>
              <Td className="tabular-nums">{c.completions}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}

function Members({ tenantId, kind }: { tenantId: string; kind: string }) {
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["members", tenantId], queryFn: () => api<Member[]>(`/tenants/${tenantId}/members`) });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Learner");
  const add = useMutation({
    mutationFn: () => post(`/tenants/${tenantId}/members`, { email, role }),
    onSuccess: () => { setEmail(""); qc.invalidateQueries({ queryKey: ["members", tenantId] }); },
  });
  const roles = kind === "Corporate" ? ["Learner", "CorporateAdmin"] : ["Learner", "Professor", "CourseManager", "FinanceManager", kind === "College" ? "CollegeAdmin" : "ProviderAdmin"];
  const submit = (e: FormEvent) => { e.preventDefault(); add.mutate(); };

  return (
    <Card>
      <CardHeader title="Members" subtitle="Add people who already have an account. They keep one login across every organization they belong to." />
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-56 flex-1"><Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field></div>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>{roles.map((r) => <option key={r}>{r}</option>)}</Select>
        </Field>
        <Button type="submit" loading={add.isPending}>Add member</Button>
        <div className="w-full"><ErrorNote error={add.error} /></div>
      </form>
      <Table head={["Name", "Email", "Roles"]}>
        {members.data?.map((m) => (
          <tr key={m.userId}>
            <Td className="font-medium">{m.fullName}</Td>
            <Td className="text-ink-mute">{m.email}</Td>
            <Td><div className="flex flex-wrap gap-1">{m.roles.map((r) => <Badge key={r} tone="blue">{r}</Badge>)}</div></Td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

function Certificates({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const certs = useQuery({ queryKey: ["tenant-certs", tenantId], queryFn: () => api<Cert[]>(`/tenants/${tenantId}/certificates`) });
  const revoke = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => post(`/certificates/${id}/revoke`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-certs", tenantId] }),
  });
  if (!certs.data) return null;
  return (
    <Card>
      <CardHeader title="Issued certificates" subtitle="Revoking updates the public verification page immediately." />
      {certs.data.length === 0 ? <Empty title="No certificates issued yet" /> : (
        <Table head={["Credential", "Recipient", "Course", "Issued", "Status", ""]}>
          {certs.data.map((c) => (
            <tr key={c.id}>
              <Td><a href={`/verify/${c.credentialCode}`} className="font-mono text-xs text-brand-700 hover:underline">{c.credentialCode}</a></Td>
              <Td>{c.recipientName}</Td>
              <Td>{c.courseTitle}</Td>
              <Td className="text-ink-mute">{date(c.issuedAt)}</Td>
              <Td><StatusBadge status={c.status} />{c.revokedReason && <div className="text-xs text-ink-mute">{c.revokedReason}</div>}</Td>
              <Td>
                {c.status === "Active" && (
                  <Button size="sm" variant="danger" onClick={() => {
                    const reason = prompt(`Revoke ${c.credentialCode}? Enter the reason (shown in the audit log):`);
                    if (reason?.trim()) revoke.mutate({ id: c.id, reason });
                  }}>Revoke</Button>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <div className="px-5 pb-3"><ErrorNote error={revoke.error} /></div>
    </Card>
  );
}
