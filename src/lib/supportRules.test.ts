import { describe, expect, it } from "vitest";
import { isOwnSupportImage, supportImageExt, supportStatus, supportText } from "./supportRules";

const ORG = "30f67669-4af4-4bf6-9521-c62999a3ae64";
const FILE = "0b8e1c2a-1111-4c4c-8d8d-123456789abc";

describe("isOwnSupportImage", () => {
  it("accepts a server-named file in the institution's own folder", () => {
    expect(isOwnSupportImage(`${ORG}/${FILE}.jpg`, ORG)).toBe(true);
    expect(isOwnSupportImage(`${ORG}/${FILE}.webp`, ORG.toUpperCase())).toBe(true);
  });

  it("refuses another institution's folder, other names and path tricks", () => {
    expect(isOwnSupportImage(`${FILE}/${FILE}.jpg`, ORG)).toBe(false);
    expect(isOwnSupportImage(`${ORG}/../${FILE}.jpg`, ORG)).toBe(false);
    expect(isOwnSupportImage(`${ORG}/${FILE}.svg`, ORG)).toBe(false);
    expect(isOwnSupportImage(`${ORG}/photo.jpg`, ORG)).toBe(false);
    expect(isOwnSupportImage(42, ORG)).toBe(false);
  });
});

describe("supportText", () => {
  it("trims and keeps line breaks", () => {
    expect(supportText("  a\r\nb  ", 10)).toBe("a\nb");
  });
  it("refuses empty and too long", () => {
    expect(supportText("   ", 10)).toBeNull();
    expect(supportText("x".repeat(11), 10)).toBeNull();
    expect(supportText(null, 10)).toBeNull();
  });
});

describe("status and types", () => {
  it("falls back to open", () => {
    expect(supportStatus("answered")).toBe("answered");
    expect(supportStatus("weird")).toBe("open");
  });
  it("knows only the bucket's picture types", () => {
    expect(supportImageExt("image/png")).toBe("png");
    expect(supportImageExt("image/gif")).toBeNull();
  });
});
