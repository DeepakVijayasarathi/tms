interface RazorpayPayload {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the payment window."));
    document.body.appendChild(s);
  });
}

/**
 * Opens Razorpay Checkout. The browser callback only tells us the user finished; the order is
 * fulfilled when the signed payment.captured webhook arrives, so callers then poll the order.
 */
export async function openRazorpay(payload: RazorpayPayload, title: string): Promise<"completed" | "dismissed"> {
  await loadScript();
  return new Promise((resolve) => {
    new window.Razorpay!({
      key: payload.keyId,
      order_id: payload.orderId,
      amount: payload.amount,
      currency: payload.currency,
      name: "TMS Learning",
      description: title,
      handler: () => resolve("completed"),
      modal: { ondismiss: () => resolve("dismissed") },
    }).open();
  });
}
