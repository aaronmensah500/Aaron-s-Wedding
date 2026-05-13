export type PaystackCurrency = "GHS" | "NGN" | "USD" | "ZAR" | "KES" | "XOF" | "XAF";

export type PaystackInlineOptions = {
  publicKey: string;
  email: string;
  /** Major units (e.g. GHS 50.5 → 5050 pesewas). */
  amountMajor: number;
  currency: PaystackCurrency;
  reference: string;
  metadata?: Record<string, unknown>;
  onSuccess: (reference: string) => void;
  onClose: () => void;
};

declare global {
  interface Window {
    PaystackPop?: {
      setup: (opts: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

const SCRIPT_SRC = "https://js.paystack.co/v1/inline.js";

let scriptPromise: Promise<void> | null = null;

export function loadPaystackInlineScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Paystack runs in the browser only"));
  if (window.PaystackPop) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Paystack script failed")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Paystack script failed"));
    document.body.appendChild(s);
  });
  return scriptPromise;
}

/** Smallest currency unit for Paystack (pesewas, kobo, cents, etc.). */
export function majorToPaystackSubunit(amountMajor: number): number {
  return Math.max(0, Math.round(amountMajor * 100));
}

export async function openPaystackInline(opts: PaystackInlineOptions): Promise<void> {
  await loadPaystackInlineScript();
  const Pop = window.PaystackPop;
  if (!Pop) throw new Error("PaystackPop unavailable");

  const amount = majorToPaystackSubunit(opts.amountMajor);
  if (amount < 1) throw new Error("Amount too small");

  const handler = Pop.setup({
    key: opts.publicKey,
    email: opts.email.trim(),
    amount,
    currency: opts.currency,
    ref: opts.reference,
    metadata: opts.metadata,
    callback: (response: { reference?: string }) => {
      opts.onSuccess(response.reference || opts.reference);
    },
    onClose: opts.onClose,
  });
  handler.openIframe();
}
