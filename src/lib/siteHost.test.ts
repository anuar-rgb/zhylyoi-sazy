import { describe, expect, it } from "vitest";
import { isLocalHost, normalizeHost, siteDomainFor } from "./siteHost";

describe("normalizeHost", () => {
  it("drops the port, case, a trailing dot and www.", () => {
    expect(normalizeHost("dk-zhylyoi.kz")).toBe("dk-zhylyoi.kz");
    expect(normalizeHost("WWW.DK-Zhylyoi.kz:443")).toBe("dk-zhylyoi.kz");
    expect(normalizeHost("dk-zhylyoi.kz.")).toBe("dk-zhylyoi.kz");
    expect(normalizeHost("test.dk-zhylyoi.kz")).toBe("test.dk-zhylyoi.kz");
    expect(normalizeHost("[::1]:3000")).toBe("[::1]");
    expect(normalizeHost("")).toBeNull();
    expect(normalizeHost(null)).toBeNull();
  });
});

describe("siteDomainFor", () => {
  it("takes a visitor's host as it is", () => {
    expect(siteDomainFor("www.dk-kulsary.kz", "dk-zhylyoi.kz")).toBe("dk-kulsary.kz");
  });

  it("puts the fallback domain for the server itself and development", () => {
    for (const host of ["localhost:3000", "127.0.0.1:3001", "[::1]:3000", "", null]) {
      expect(siteDomainFor(host, "dk-zhylyoi.kz")).toBe("dk-zhylyoi.kz");
    }
    expect(isLocalHost("127.0.0.1")).toBe(true);
    expect(isLocalHost("dk-zhylyoi.kz")).toBe(false);
  });
});
