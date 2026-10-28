import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { date, dateTime, money, percent } from "@/lib/format";
import type { CommissionEntry, Payout } from "@/lib/types";
import { Button, Card, CardHeader, Empty, ErrorNote, Field, Input, PageHeader, Select, Spinner, Stat, StatusBadge, Table, Td, cx } from "@/components/ui";
import { EntriesTable } from "@/pages/Earnings";

interface PlatformStats {
  tenants: number; users: number; publishedCourses: number; activeEnrollments: number; certificatesIssued: number;
  paidOrders: number; pendingOrders: number; collectedMinor: number; refundedMinor: number; taxMinor: number;
  platformShareMinor: number; commissionLiabilityMinor: number; paidOutMinor: number; aiMessages: number; aiTokens: number;
  liabilityByStatus: { status: string; amountMinor: number }[];
}
interface Plan { id: string; planKey: string; version: number; name: string; tenant?: string; course?: string; professorBp: number; collegeBp: number; referralBp: number; stacking: string; holdDays: number; effectiveFrom: string; effectiveTo?: string; status: string }
interface AdminOrder { id: string; status: string; totalMinor: number; taxMinor: number; refundedMinor: number; currency: string; provider: string; createdAt: string; buyer: string; items: string[]; referral?: string }

const TABS = ["overview", "commissions", "payouts", "plans", "orders"] as const;

export function AdminHome() {
  const { can } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("overview");
  if (!can("analytics.view") && !can("commission.approve")) return <Empty title="Platform staff only" />;

  return (
    <div>
      <PageHeader eyebrow="Overview" title="Admin Dashboard" subtitle="Revenue, commission liabilities and payouts across every tenant." />
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx("-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium capitalize", tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-ink-mute hover:text-ink")}>
            {t}
          </button>
        ))}
      </div>
      {tab === "overview" && <Overview />}
      {tab === "commissions" && <Commissions />}
      {tab === "payouts" && <Payouts />}
      {tab === "plans" && <Plans />}
      {tab === "orders" && <Orders />}
    </div>
  );
}

function Overview() {
  const s = useQuery({ queryKey: ["platform-stats"], queryFn: () => api<PlatformStats>("/analytics/platform") });
  if (s.isLoading) return <Spinner />;
  if (!s.data) return <ErrorNote error={s.error} />;
  const d = s.data;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Collected revenue" value={money(d.collectedMinor)} hint={`${d.paidOrders} paid orders · ${d.pendingOrders} pending`} />
        <Stat label="Refunded" value={money(d.refundedMinor)} />
        <Stat label="GST collected (net of refunds)" value={money(d.taxMinor)} />
        <Stat label="Platform share" value={money(d.platformShareMinor)} hint="After commissions, net of reversals" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Outstanding commission liability" value={money(d.commissionLiabilityMinor)} hint={d.liabilityByStatus.map((l) => `${l.status} ${money(l.amountMinor)}`).join(" · ") || "None"} />
        <Stat label="Commissions paid out" value={money(d.paidOutMinor)} />
        <Stat label="Organizations" value={d.tenants} hint={`${d.users} users`} />
        <Stat label="Published courses" value={d.publishedCourses} hint={`${d.activeEnrollments} active enrollments · ${d.certificatesIssued} certificates`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="AI tutor answers" value={d.aiMessages} hint={`${d.aiTokens.toLocaleString()} tokens`} />
      </div>
    </div>
  );
}

function Commissions() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("Pending");
  const entries = useQuery({ queryKey: ["admin-entries", status], queryFn: () => api<CommissionEntry[]>(`/commissions/entries${status ? `?status=${status}` : ""}`) });
  const approve = useMutation({
    mutationFn: (ids: string[]) => post<{ approved: number }>("/commissions/approve", { entryIds: ids }),
    onSuccess: () => qc.invalidateQueries(),
  });
  const pendingIds = entries.data?.filter((e) => e.status === "Pending").map((e) => e.id) ?? [];

  return (
    <Card>
      <CardHeader
        title="Commission ledger"
        subtitle="Approving moves earnings to payable once their holding period ends. Amounts are never edited; refunds post reversal entries."
        action={
          <div className="flex items-center gap-2">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
              <option value="">All statuses</option>
              {["Pending", "Approved", "Payable", "Paid", "Reversed"].map((s) => <option key={s}>{s}</option>)}
            </Select>
            <Button disabled={!pendingIds.length} loading={approve.isPending} onClick={() => approve.mutate(pendingIds)}>Approve {pendingIds.length || ""} pending</Button>
          </div>
        }
      />
      <ErrorNote error={approve.error} />
      {entries.isLoading ? <Spinner /> : <EntriesTable entries={entries.data ?? []} showRecipient />}
    </Card>
  );
}

function Payouts() {
  const qc = useQueryClient();
  const payouts = useQuery({ queryKey: ["admin-payouts"], queryFn: () => api<Payout[]>("/payouts?all=true") });
  const act = useMutation({
    mutationFn: ({ id, action, reference }: { id: string; action: "approve" | "reject" | "mark-paid"; reference?: string }) =>
      post(`/payouts/${id}/${action}`, reference ? { reference } : {}),
    onSuccess: () => qc.invalidateQueries(),
  });

  return (
    <Card>
      <CardHeader title="Payout requests" subtitle="Requesters can't approve their own payouts. Mark paid once the bank or provider transfer has a reference." />
      <ErrorNote error={act.error} />
      {!payouts.data?.length ? <Empty title="No payout requests" /> : (
        <Table head={["Requested", "Recipient", "Amount", "Entries", "Status", "Reference", ""]}>
          {payouts.data.map((p) => (
            <tr key={p.id}>
              <Td className="text-ink-mute">{date(p.createdAt)}</Td>
              <Td>{p.recipient} <span className="text-ink-mute">({p.recipientKind})</span></Td>
              <Td className="tabular-nums font-medium">{money(p.amountMinor, p.currency)}</Td>
              <Td className="tabular-nums">{p.entries}</Td>
              <Td><StatusBadge status={p.status} /></Td>
              <Td className="text-ink-mute">{p.reference ?? "—"}</Td>
              <Td className="whitespace-nowrap text-right">
                {p.status === "Requested" && (
                  <span className="space-x-2">
                    <Button size="sm" onClick={() => act.mutate({ id: p.id, action: "approve" })}>Approve</Button>
                    <Button size="sm" variant="danger" onClick={() => act.mutate({ id: p.id, action: "reject" })}>Reject</Button>
                  </span>
                )}
                {p.status === "Approved" && (
                  <Button size="sm" onClick={() => {
                    const reference = prompt("Bank / provider transfer reference (UTR):");
                    if (reference?.trim()) act.mutate({ id: p.id, action: "mark-paid", reference });
                  }}>Mark paid</Button>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

function Plans() {
  const qc = useQueryClient();
  const plans = useQuery({ queryKey: ["plans"], queryFn: () => api<Plan[]>("/commissions/plans") });
  const [editing, setEditing] = useState<Plan | null>(null);
  const [f, setF] = useState({ name: "", professor: "40", college: "10", referral: "5", stacking: "NoInstructorReferral", holdDays: "7" });
  const save = useMutation({
    mutationFn: () => post("/commissions/plans", {
      planKey: editing?.planKey ?? null,
      name: f.name,
      professorBp: Math.round(+f.professor * 100),
      collegeBp: Math.round(+f.college * 100),
      referralBp: Math.round(+f.referral * 100),
      stacking: f.stacking,
      holdDays: +f.holdDays,
    }),
    onSuccess: () => { setEditing(null); qc.invalidateQueries({ queryKey: ["plans"] }); },
  });
  const edit = (p: Plan) => {
    setEditing(p);
    setF({ name: p.name, professor: String(p.professorBp / 100), college: String(p.collegeBp / 100), referral: String(p.referralBp / 100), stacking: p.stacking, holdDays: String(p.holdDays) });
  };
  const platformShare = 100 - (+f.professor + +f.college + +f.referral);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Commission plans" subtitle="Precedence: course-specific → organization-specific → platform default. Editing creates a new version; past entries keep the version they were calculated under." />
        <Table head={["Plan", "Scope", "Professor", "College", "Referral", "Stacking", "Hold", "Effective", "Status", ""]}>
          {plans.data?.map((p) => (
            <tr key={p.id} className={p.status !== "Active" ? "text-ink-mute" : ""}>
              <Td className="font-medium">{p.name} v{p.version}</Td>
              <Td>{p.course ?? p.tenant ?? "Platform default"}</Td>
              <Td className="tabular-nums">{percent(p.professorBp)}</Td>
              <Td className="tabular-nums">{percent(p.collegeBp)}</Td>
              <Td className="tabular-nums">{percent(p.referralBp)}</Td>
              <Td>{p.stacking === "NoInstructorReferral" ? "No double-dip" : "Allowed"}</Td>
              <Td>{p.holdDays} d</Td>
              <Td className="whitespace-nowrap">{dateTime(p.effectiveFrom)}{p.effectiveTo && ` → ${dateTime(p.effectiveTo)}`}</Td>
              <Td><StatusBadge status={p.status} /></Td>
              <Td>{p.status === "Active" && <Button size="sm" variant="secondary" onClick={() => edit(p)}>Edit</Button>}</Td>
            </tr>
          ))}
        </Table>
      </Card>

      {editing && (
        <Card>
          <CardHeader title={`New version of ${editing.name}`} subtitle={`Becomes v${editing.version + 1} and applies to sales from now on.`} />
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid gap-4 p-5 sm:grid-cols-3 lg:grid-cols-6">
            <div className="sm:col-span-3 lg:col-span-2"><Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field></div>
            <Field label="Professor %"><Input type="number" step="0.01" min="0" value={f.professor} onChange={(e) => setF({ ...f, professor: e.target.value })} /></Field>
            <Field label="College %"><Input type="number" step="0.01" min="0" value={f.college} onChange={(e) => setF({ ...f, college: e.target.value })} /></Field>
            <Field label="Referral %"><Input type="number" step="0.01" min="0" value={f.referral} onChange={(e) => setF({ ...f, referral: e.target.value })} /></Field>
            <Field label="Hold days"><Input type="number" min="0" value={f.holdDays} onChange={(e) => setF({ ...f, holdDays: e.target.value })} /></Field>
            <div className="sm:col-span-3 lg:col-span-2">
              <Field label="Instructor uses own referral link">
                <Select value={f.stacking} onChange={(e) => setF({ ...f, stacking: e.target.value })}>
                  <option value="NoInstructorReferral">Referral share goes to platform</option>
                  <option value="AllowStacking">Instructor earns both shares</option>
                </Select>
              </Field>
            </div>
            <p className={cx("self-end pb-2 text-sm sm:col-span-3 lg:col-span-4", platformShare < 0 ? "text-red-700" : "text-ink-mute")}>
              Platform keeps {platformShare.toFixed(2)}% of the net-of-tax revenue (plus any share that doesn't apply to a sale).
            </p>
            <div className="flex items-center gap-2 sm:col-span-3 lg:col-span-6">
              <Button type="submit" loading={save.isPending} disabled={platformShare < 0}>Save as new version</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <ErrorNote error={save.error} />
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

function Orders() {
  const qc = useQueryClient();
  const orders = useQuery({ queryKey: ["admin-orders"], queryFn: () => api<AdminOrder[]>("/admin/orders") });
  const refund = useMutation({
    mutationFn: ({ id, amountMinor, reason }: { id: string; amountMinor: number; reason: string }) => post(`/admin/orders/${id}/refunds`, { amountMinor, reason }),
    onSuccess: () => qc.invalidateQueries(),
  });

  return (
    <Card>
      <CardHeader title="Orders" subtitle="Orders are fulfilled only from verified provider webhooks. Refunds revoke access on full refund and reverse commissions proportionally." />
      <ErrorNote error={refund.error} />
      {!orders.data?.length ? <Empty title="No orders yet" /> : (
        <Table head={["Date", "Buyer", "Course", "Total", "Refunded", "Referral", "Status", ""]}>
          {orders.data.map((o) => {
            const refundable = o.totalMinor - o.refundedMinor;
            return (
              <tr key={o.id}>
                <Td className="whitespace-nowrap text-ink-mute">{dateTime(o.createdAt)}</Td>
                <Td>{o.buyer}</Td>
                <Td>{o.items.join(", ")}</Td>
                <Td className="tabular-nums">{money(o.totalMinor, o.currency)}</Td>
                <Td className="tabular-nums">{o.refundedMinor ? money(o.refundedMinor, o.currency) : "—"}</Td>
                <Td className="font-mono text-xs">{o.referral ?? "—"}</Td>
                <Td><StatusBadge status={o.status} /></Td>
                <Td>
                  {(o.status === "Paid" || o.status === "PartiallyRefunded") && (
                    <Button size="sm" variant="danger" onClick={() => {
                      const amount = prompt(`Refund amount in ₹ (up to ${(refundable / 100).toFixed(2)}):`, (refundable / 100).toFixed(2));
                      if (!amount) return;
                      const reason = prompt("Reason for the refund:");
                      if (reason?.trim()) refund.mutate({ id: o.id, amountMinor: Math.round(parseFloat(amount) * 100), reason });
                    }}>Refund</Button>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
    </Card>
  );
}
