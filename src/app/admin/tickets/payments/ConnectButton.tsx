"use client";

import { useState } from "react";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { connectPaymentProvider } from "./actions";

/** «Подключить» on a payment system's card: adds the method and opens its settings page. */
export default function ConnectButton({ providerCode }: { providerCode: string }) {
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    // On success the action redirects to the method's page and does not come back here.
    const result = await connectPaymentProvider(providerCode);
    setBusy(false);
    if (result?.error) feedback.error(result.error);
  }

  return (
    <button type="button" disabled={busy} onClick={connect} className="btn-primary px-5 py-2 text-sm font-semibold disabled:opacity-50">
      {busy ? "…" : "Подключить"}
    </button>
  );
}
