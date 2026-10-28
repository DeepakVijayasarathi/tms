import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { api, post } from "@/lib/api";
import { money } from "@/lib/format";
import { Button, Card, ErrorNote, Spinner, StatusBadge } from "@/components/ui";

interface Order {
  id: string;
  status: string;
  currency: string;
  totalMinor: number;
  taxMinor: number;
  refundedMinor: number;
  items: { courseId: string; courseTitle: string; unitPriceMinor: number }[];
  enrollmentId?: string;
}

/** Stand-in for a provider's hosted checkout in development. Payment is confirmed by a signed webhook. */
export function SandboxCheckout() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const order = useQuery({ queryKey: ["order", orderId], queryFn: () => api<Order>(`/orders/${orderId}`) });
  const pay = useMutation({
    mutationFn: () => post(`/dev/sandbox/orders/${orderId}/pay`),
    onSuccess: () => navigate(`/orders/${orderId}`),
  });

  if (order.isLoading) return <Spinner />;
  if (!order.data) return <ErrorNote error={order.error} />;
  const o = order.data;

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Sandbox payment page — no real money moves. In production this is the payment provider's checkout.
      </div>
      <Card className="p-6">
        <div className="flex items-center gap-2 text-ink-mute"><CreditCard className="h-5 w-5" aria-hidden /> Sandbox Pay</div>
        <h1 className="mt-4 text-lg font-semibold">{o.items[0]?.courseTitle}</h1>
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-ink-mute">Includes GST</dt><dd>{money(o.taxMinor, o.currency)}</dd></div>
          <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{money(o.totalMinor, o.currency)}</dd></div>
        </dl>
        {o.status === "Pending" ? (
          <Button className="mt-6 w-full py-2.5" loading={pay.isPending} onClick={() => pay.mutate()}>Pay {money(o.totalMinor, o.currency)}</Button>
        ) : (
          <Link to={`/orders/${o.id}`} className="mt-6 block text-center text-sm font-medium text-brand-700">This order is {o.status.toLowerCase()} — view it</Link>
        )}
        <div className="mt-3"><ErrorNote error={pay.error} /></div>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-mute"><ShieldCheck className="h-4 w-4" aria-hidden /> Card details are never stored by the platform.</p>
      </Card>
    </div>
  );
}

export function OrderStatus() {
  const { orderId } = useParams();
  // Fulfilment happens on the provider webhook, so poll briefly until the order settles.
  const order = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api<Order>(`/orders/${orderId}`),
    refetchInterval: (q) => (q.state.data?.status === "Pending" ? 2000 : false),
  });

  if (order.isLoading) return <Spinner />;
  if (!order.data) return <ErrorNote error={order.error} />;
  const o = order.data;

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6 text-center">
        {o.status === "Paid" ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
            <h1 className="mt-3 font-display text-2xl font-semibold">Payment confirmed</h1>
            <p className="mt-1 text-ink-mute">You're enrolled in {o.items[0]?.courseTitle}.</p>
            {o.enrollmentId && (
              <Link to={`/learn/${o.enrollmentId}`} className="mt-6 inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">Start learning</Link>
            )}
          </>
        ) : o.status === "Pending" ? (
          <>
            <Spinner label="Waiting for payment confirmation" />
            <p className="text-sm text-ink-mute">This usually takes a few seconds.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Order {o.status.toLowerCase()}</h1>
            <div className="mt-2"><StatusBadge status={o.status} /></div>
            {o.refundedMinor > 0 && <p className="mt-2 text-sm text-ink-mute">Refunded {money(o.refundedMinor, o.currency)}</p>}
          </>
        )}
      </Card>
    </div>
  );
}
