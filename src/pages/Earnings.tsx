import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2 } from "lucide-react";
import { api, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { date, money, percent } from "@/lib/format";
import type { Balance, CommissionEntry, Payout } from "@/lib/types";
import { Badge, Button, Card, CardHeader, Empty, ErrorNote, PageHeader, Stat, StatusBadge, Table, Td } from "@/components/ui";

interface ReferralDashboard {
  codes: { id: string; code: string; campaign?: string; conversions: number }[];
  conversions: { id: string; status: string; note?: string; createdAt: string; course?: string; earned: number }[];
  balance: Balance;
}

export function Earnings() {
  const { me, can } = useAuth();
  const isProfessor = !!me?.tenants.some((t) => t.roles.includes("Professor"));
  const colleges = me?.tenants.filter((t) => t.kind === "College" && t.permissions.includes("members.manage")) ?? [];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Finance" title="Earnings & Payouts" subtitle="Commission, referral rewards and payouts. Every amount links back to the sale and the plan version it was calculated under." />
      {isProfessor && <ProfessorEarnings />}
      {colleges.map((t) => can("analytics.view", t.id) && <CollegeEarnings key={t.id} tenantId={t.id} name={t.name} />)}
      <Referrals />
      <Payouts />
    </div>
  );
}

function BalanceRow({ balance }: { balance: Balance }) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <Stat label="Pending approval" value={money(balance.pending, balance.currency)} />
      <Stat label="Approved (holding)" value={money(balance.approved, balance.currency)} hint="Released after the refund window" />
      <Stat label="Payable now" value={money(balance.payable, balance.currency)} />
      <Stat label="Paid out" value={money(balance.paid, balance.currency)} />
    </div>
  );
}

function PayoutButton({ kind, tenantId, payable }: { kind: string; tenantId?: string; payable: number }) {
  const qc = useQueryClient();
  const [key] = useState(() => crypto.randomUUID());
  const request = useMutation({
    mutationFn: () => post("/payouts", { recipientKind: kind, tenantId, idempotencyKey: key }),
    onSuccess: () => qc.invalidateQueries(),
  });
  return (
    <div className="flex items-center gap-3">
      <ErrorNote error={request.error} />
      <Button size="sm" disabled={payable <= 0} loading={request.isPending} onClick={() => request.mutate()}>Request payout</Button>
    </div>
  );
}

export function EntriesTable({ entries, showRecipient }: { entries: CommissionEntry[]; showRecipient?: boolean }) {
  if (!entries.length) return <Empty title="No commission entries yet">They appear when a sale you're part of is paid.</Empty>;
  return (
    <Table head={["Date", "Course", ...(showRecipient ? ["Recipient"] : []), "Type", "Base", "Rate", "Amount", "Plan", "Status"]}>
      {entries.map((e) => (
        <tr key={e.id} title={e.calculation}>
          <Td className="whitespace-nowrap text-ink-mute">{date(e.createdAt)}</Td>
          <Td>{e.course}</Td>
          {showRecipient && <Td>{e.recipient} <span className="text-ink-mute">({e.recipientKind})</span></Td>}
          <Td>{e.entryType === "Reversal" ? <Badge tone="red">Refund reversal</Badge> : <Badge>Sale</Badge>}</Td>
          <Td className="whitespace-nowrap tabular-nums text-ink-mute">{money(e.baseMinor, e.currency)}</Td>
          <Td className="tabular-nums text-ink-mute">{percent(e.rateBp)}</Td>
          <Td className={`whitespace-nowrap tabular-nums font-medium ${e.amountMinor < 0 ? "text-red-700" : ""}`}>{money(e.amountMinor, e.currency)}</Td>
          <Td className="whitespace-nowrap text-ink-mute">{e.plan} v{e.planVersion}</Td>
          <Td>
            <StatusBadge status={e.status} />
            {e.releaseStage && e.entryType === "Accrual" && (
              <div className="mt-1 whitespace-nowrap text-[11px] text-ink-mute">
                {e.releasedAt ? "Released ✓" : "Held until"} {STAGE_LABEL[e.releaseStage]}
              </div>
            )}
          </Td>
        </tr>
      ))}
    </Table>
  );
}

// Staged referral payouts: the learner progress that releases each part.
const STAGE_LABEL: Record<NonNullable<CommissionEntry["releaseStage"]>, string> = {
  Purchase: "at purchase", FirstMilestone: "first milestone", HalfwayMilestones: "halfway milestones", CourseCompleted: "course completion",
};

function ProfessorEarnings() {
  const data = useQuery({ queryKey: ["prof-commissions"], queryFn: () => api<{ balance: Balance; entries: CommissionEntry[] }>("/professors/me/commissions") });
  if (!data.data) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Instructor commission</h2>
      <BalanceRow balance={data.data.balance} />
      <Card>
        <CardHeader title="Ledger" subtitle="Hover a row to see the full calculation." action={<PayoutButton kind="Professor" payable={data.data.balance.payable} />} />
        <EntriesTable entries={data.data.entries} />
      </Card>
    </section>
  );
}

function CollegeEarnings({ tenantId, name }: { tenantId: string; name: string }) {
  const data = useQuery({ queryKey: ["college-commissions", tenantId], queryFn: () => api<{ balance: Balance; entries: CommissionEntry[] }>(`/colleges/${tenantId}/commissions`) });
  if (!data.data) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{name} — institution share</h2>
      <BalanceRow balance={data.data.balance} />
      <Card>
        <CardHeader title="Ledger" action={<PayoutButton kind="College" tenantId={tenantId} payable={data.data.balance.payable} />} />
        <EntriesTable entries={data.data.entries} />
      </Card>
    </section>
  );
}

function Referrals() {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["referrals"], queryFn: () => api<ReferralDashboard>("/referrals/dashboard") });
  const create = useMutation({ mutationFn: () => post("/referrals/codes", {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["referrals"] }) });
  const [copied, setCopied] = useState<string | null>(null);
  if (!data.data) return null;
  const d = data.data;
  const link = (code: string) => `${location.origin}/?ref=${code}`;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Referrals</h2>
      <Card>
        <CardHeader
          title="Your referral links"
          subtitle="Earn a share of each paid course bought through your link (last-click, 30 days). Self-referrals don't count."
          action={d.codes.length === 0 && <Button size="sm" loading={create.isPending} onClick={() => create.mutate()}><Link2 className="h-4 w-4" aria-hidden /> Create my link</Button>}
        />
        {d.codes.length === 0 ? <Empty title="No referral link yet" /> : (
          <ul className="divide-y divide-slate-100">
            {d.codes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <code className="rounded bg-slate-100 px-2 py-1 font-mono text-sm">{c.code}</code>
                <span className="min-w-0 flex-1 truncate text-sm text-ink-mute">{link(c.code)}</span>
                <span className="text-sm text-ink-mute">{c.conversions} conversions</span>
                <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(link(c.code)); setCopied(c.code); }}>
                  <Copy className="h-4 w-4" aria-hidden /> {copied === c.code ? "Copied" : "Copy link"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {(d.conversions.length > 0 || d.balance.paid + d.balance.payable + d.balance.pending + d.balance.approved !== 0) && (
        <>
          <BalanceRow balance={d.balance} />
          <Card>
            <CardHeader title="Conversions" action={<PayoutButton kind="Referrer" payable={d.balance.payable} />} />
            <Table head={["Date", "Course", "Earned", "Status", "Note"]}>
              {d.conversions.map((c) => (
                <tr key={c.id}>
                  <Td className="text-ink-mute">{date(c.createdAt)}</Td>
                  <Td>{c.course}</Td>
                  <Td className="tabular-nums">{money(c.earned)}</Td>
                  <Td><StatusBadge status={c.status} /></Td>
                  <Td className="text-ink-mute">{c.note}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}
    </section>
  );
}

function Payouts() {
  const data = useQuery({ queryKey: ["payouts"], queryFn: () => api<Payout[]>("/payouts") });
  if (!data.data?.length) return null;
  return (
    <Card>
      <CardHeader title="Payout history" subtitle="Payouts are approved by the finance team, never by the requester." />
      <Table head={["Requested", "Account", "Amount", "Status", "Reference"]}>
        {data.data.map((p) => (
          <tr key={p.id}>
            <Td className="text-ink-mute">{date(p.createdAt)}</Td>
            <Td>{p.recipient} <span className="text-ink-mute">({p.recipientKind})</span></Td>
            <Td className="tabular-nums font-medium">{money(p.amountMinor, p.currency)}</Td>
            <Td><StatusBadge status={p.status} /></Td>
            <Td className="text-ink-mute">{p.reference ?? "—"}</Td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}
