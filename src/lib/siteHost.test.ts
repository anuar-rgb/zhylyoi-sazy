import { describe, expect, it } from "vitest";
import { cleanDomain, isLocalHost, normalizeHost, siteDomainFor } from "./siteHost";

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

describe("cleanDomain", () => {
  it("keeps the bare domain of what a person types", () => {
    expect(cleanDomain("https://www.DK-Kulsary.kz/admin")).toBe("dk-kulsary.kz");
    expect(cleanDomain(" dk-zhylyoi.kz ")).toBe("dk-zhylyoi.kz");
    expect(cleanDomain("test.dk-zhylyoi.kz")).toBe("test.dk-zhylyoi.kz");
  });

  it("refuses what is not a domain", () => {
    for (const bad of ["", "localhost", "dk kulsary.kz", "-dk.kz", "dk.k", "77.243.80.210"]) expect(cleanDomain(bad)).toBeNull();
  });
});
