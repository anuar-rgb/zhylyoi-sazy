import { afterEach, describe, expect, it, vi } from "vitest";
import { halykEpayProvider as halyk } from "./halykEpay";
import { getProvider } from "./registry";
import { decryptSecret, encryptSecret } from "./secretBox";

const secrets = { merchantId: "terminal", clientId: "client", secretKey: "secret" };
const INVOICE = "123456789000001";

/** Halyk's status answers, one per call, and a record of what was charged. */
function fakeHalyk(answers: Record<string, unknown>[], operations: Record<string, number> = {}) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (url.includes("oauth2/token")) return Response.json({ access_token: "token", expires_in: 1200 });
      if (url.includes("/operation/")) {
        const status = Object.entries(operations).find(([part]) => url.includes(part))?.[1] ?? 200;
        return new Response(status === 200 ? '{"code":0}' : '{"code":1}', { status });
      }
      return Response.json(answers.length > 1 ? answers.shift() : answers[0]);
    })
  );
  return calls;
}

const paid = (statusName: string) => ({ resultCode: "100", transaction: { id: "txn", amount: 500, currency: "KZT", statusName } });

afterEach(() => vi.unstubAllGlobals());

describe("Halyk status", () => {
  const status = () => halyk.getPaymentStatus({ providerPaymentId: INVOICE, metadata: {}, secrets });

  it("reads a charged payment as success, with Halyk's amount", async () => {
    fakeHalyk([paid("CHARGE")]);
    await expect(status()).resolves.toMatchObject({ ok: true, observed: { status: "success", amount: 500, currency: "KZT", transactionId: "txn" } });
  });

  it("charges a blocked payment, then reads it again", async () => {
    const calls = fakeHalyk([paid("AUTH"), paid("CHARGE")]);
    await expect(status()).resolves.toMatchObject({ ok: true, observed: { status: "success" } });
    expect(calls.some((call) => call.startsWith("POST") && call.endsWith("/operation/txn/charge"))).toBe(true);
  });

  it("never calls a blocked payment paid when the charge fails", async () => {
    fakeHalyk([paid("AUTH")], { "/charge": 400 });
    await expect(status()).resolves.toEqual({ ok: false, reason: "charge_failed" });
  });

  it("reads a rejected payment as failed and an unknown number as not paid yet", async () => {
    fakeHalyk([{ resultCode: "101", transaction: { id: "txn", amount: 500, currency: "KZT", statusName: "REJECT" } }]);
    await expect(status()).resolves.toMatchObject({ ok: true, observed: { status: "failed" } });
    fakeHalyk([{ resultCode: "102", transaction: { id: "", statusName: "" } }]);
    await expect(status()).resolves.toMatchObject({ ok: true, observed: { status: "pending", amount: null } });
  });

  it("does not read an error or an unknown status as a result", async () => {
    fakeHalyk([{ resultCode: "103", transaction: null }]);
    await expect(status()).resolves.toMatchObject({ ok: false });
    fakeHalyk([paid("SOMETHING_NEW")]);
    await expect(status()).resolves.toMatchObject({ ok: false });
  });

  it("treats Halyk being unreachable as no answer, never as a failed payment", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    await expect(status()).resolves.toMatchObject({ ok: false });
  });
});

describe("Halyk notification", () => {
  const notify = (body: unknown) => halyk.verifyWebhook({ headers: new Headers(), rawBody: JSON.stringify(body), secrets });

  it("believes Halyk's status answer, not what the message says", async () => {
    fakeHalyk([{ resultCode: "102", transaction: null }]);
    await expect(notify({ invoiceId: INVOICE, code: "ok", reason: "success", amount: 500 })).resolves.toMatchObject({ ok: true, observed: { status: "pending" } });
  });

  it("rejects a wrong secret_hash and a malformed number without asking Halyk", async () => {
    const calls = fakeHalyk([paid("CHARGE")]);
    await expect(notify({ invoiceId: INVOICE, secret_hash: "forged" })).resolves.toMatchObject({ ok: false, status: 401 });
    await expect(notify({ invoiceId: "abc" })).resolves.toMatchObject({ ok: false, status: 422 });
    expect(calls).toEqual([]);
  });

  it("asks Halyk to send it again when the status cannot be read", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    await expect(notify({ invoiceId: INVOICE })).resolves.toMatchObject({ ok: false, status: 503 });
  });
});

describe("Halyk refund", () => {
  const refund = (transactionId: string | null) =>
    halyk.refundPayment({ paymentId: "p1", providerPaymentId: INVOICE, transactionId, amount: 500, currency: "KZT", secrets });

  it("says refunded only when Halyk agreed", async () => {
    const calls = fakeHalyk([], {});
    await expect(refund("txn")).resolves.toEqual({ ok: true, status: "refunded" });
    expect(calls.at(-1)).toContain("/operation/txn/refund?externalID=p1");
    fakeHalyk([], { "/refund": 400 });
    await expect(refund("txn")).resolves.toMatchObject({ ok: false });
    await expect(refund(null)).resolves.toMatchObject({ ok: false });
  });
});

describe("the switch on the live site", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("keeps Halyk off in production until it is turned on", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("HALYK_EPAY_LIVE", "");
    expect(getProvider("halyk_epay")).toBeNull();
    vi.stubEnv("HALYK_EPAY_LIVE", "1");
    expect(getProvider("halyk_epay")).not.toBeNull();
  });
});

describe("secret encryption", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("round-trips, and is unreadable with another key or none", () => {
    vi.stubEnv("PAYMENT_SECRETS_KEY", "one");
    const stored = encryptSecret("my secret")!;
    expect(stored).not.toContain("my secret");
    expect(decryptSecret(stored)).toBe("my secret");
    vi.stubEnv("PAYMENT_SECRETS_KEY", "two");
    expect(decryptSecret(stored)).toBeNull();
    vi.stubEnv("PAYMENT_SECRETS_KEY", "");
    expect(decryptSecret(stored)).toBeNull();
    expect(encryptSecret("my secret")).toBeNull();
  });
});
