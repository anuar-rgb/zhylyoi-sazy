import { describe, expect, it } from "vitest";
import { checkPayable, type BookingFacts, type MethodFacts } from "./create";
import { orderStatusOf } from "./orderStatus";

const NOW = new Date("2026-10-10T12:00:00Z");
const ORG = "org-a";
const METHOD = "method-1";

const booking = (over: Partial<BookingFacts> = {}): BookingFacts => ({
  status: "pending",
  totalAmount: 1500,
  expiresAt: "2026-10-10T12:10:00Z",
  organizationId: ORG,
  eventPaymentMethodId: null,
  ...over,
});
const method = (over: Partial<MethodFacts> = {}): MethodFacts => ({
  organizationId: ORG,
  isEnabled: true,
  mode: "api",
  providerCode: "mock",
  ...over,
});

describe("checkPayable", () => {
  it("allows a waiting, unexpired order with a bank method of the same institution", () => {
    expect(checkPayable(booking(), method(), METHOD, NOW)).toBeNull();
  });

  it("refuses an order that is already settled, closed or expired", () => {
    for (const status of ["confirmed", "cancelled", "expired", "refunded"]) {
      expect(checkPayable(booking({ status }), method(), METHOD, NOW)).toBe("not_payable");
    }
  });

  it("refuses an order whose hold has run out, even if not yet marked expired", () => {
    expect(checkPayable(booking({ expiresAt: "2026-10-10T11:59:00Z" }), method(), METHOD, NOW)).toBe("not_payable");
  });

  it("refuses a free order", () => {
    expect(checkPayable(booking({ totalAmount: 0 }), method(), METHOD, NOW)).toBe("not_payable");
  });

  it("refuses another institution's method", () => {
    expect(checkPayable(booking(), method({ organizationId: "org-b" }), METHOD, NOW)).toBe("method_unavailable");
  });

  it("refuses a switched-off method and one that is not set to go through a bank", () => {
    expect(checkPayable(booking(), method({ isEnabled: false }), METHOD, NOW)).toBe("method_unavailable");
    expect(checkPayable(booking(), method({ mode: "manual" }), METHOD, NOW)).toBe("method_unavailable");
  });

  it("refuses a method other than the one the event chose", () => {
    expect(checkPayable(booking({ eventPaymentMethodId: "method-2" }), method(), METHOD, NOW)).toBe("method_unavailable");
    expect(checkPayable(booking({ eventPaymentMethodId: METHOD }), method(), METHOD, NOW)).toBeNull();
  });
});

describe("orderStatusOf", () => {
  it("maps the booking status to the order status the pages show", () => {
    expect(orderStatusOf("pending", 1500)).toBe("PENDING");
    expect(orderStatusOf("confirmed", 1500)).toBe("PAID");
    expect(orderStatusOf("confirmed", 0)).toBe("FREE");
    expect(orderStatusOf("cancelled", 1500)).toBe("CANCELLED");
    expect(orderStatusOf("expired", 1500)).toBe("EXPIRED");
    expect(orderStatusOf("refunded", 1500)).toBe("REFUNDED");
  });

  it("treats anything unknown as not paid", () => {
    expect(orderStatusOf("something_new", 1500)).toBe("PENDING");
  });
});
