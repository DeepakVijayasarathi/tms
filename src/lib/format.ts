export function money(minor: number, currency = "INR"): string {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

export function date(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function dateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z").toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function minutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const percent = (bp: number) => `${(bp / 100).toFixed(bp % 100 === 0 ? 0 : 2)}%`;

/** Last-touch referral capture: a ?ref= code is remembered for 30 days. */
const REF_KEY = "tms.ref";
export const referral = {
  capture(search: string) {
    const code = new URLSearchParams(search).get("ref");
    if (!code) return;
    try {
      localStorage.setItem(REF_KEY, JSON.stringify({ code: code.toUpperCase(), at: Date.now() }));
    } catch {
      /* ignore */
    }
  },
  get(): string | null {
    try {
      const raw = localStorage.getItem(REF_KEY);
      if (!raw) return null;
      const { code, at } = JSON.parse(raw);
      return Date.now() - at < 30 * 24 * 3600 * 1000 ? code : null;
    } catch {
      return null;
    }
  },
};
