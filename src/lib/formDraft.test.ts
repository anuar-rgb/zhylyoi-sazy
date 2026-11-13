import { describe, expect, it } from "vitest";
import { DRAFT_TTL_MS, clearDraft, isBlankDraft, readDraft, writeDraft, type DraftStorage } from "./formDraft";

function memory(): DraftStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe("form drafts", () => {
  it("gives back what was saved within the time limit", () => {
    const s = memory();
    writeDraft(s, "seats:e1", { seatIds: ["a", "b"], email: "x@y.kz" }, 1000);
    expect(readDraft(s, "seats:e1", 1000 + DRAFT_TTL_MS)).toEqual({ seatIds: ["a", "b"], email: "x@y.kz" });
  });

  it("drops a draft past the limit, or one dated in the future", () => {
    const s = memory();
    writeDraft(s, "k", { a: 1 }, 1000);
    expect(readDraft(s, "k", 1000 + DRAFT_TTL_MS + 1)).toBeNull();
    expect(s.data.size).toBe(0);
    writeDraft(s, "k", { a: 1 }, 5000);
    expect(readDraft(s, "k", 4000)).toBeNull();
  });

  it("ignores damaged entries and missing storage", () => {
    const s = memory();
    s.setItem("draft:k", "{not json");
    expect(readDraft(s, "k")).toBeNull();
    expect(readDraft(null, "k")).toBeNull();
    expect(() => writeDraft(null, "k", 1)).not.toThrow();
  });

  it("survives storage that throws", () => {
    const broken: DraftStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readDraft(broken, "k")).toBeNull();
    expect(() => writeDraft(broken, "k", 1)).not.toThrow();
    expect(() => clearDraft(broken, "k")).not.toThrow();
  });

  it("clears a draft", () => {
    const s = memory();
    writeDraft(s, "k", { a: "x" });
    clearDraft(s, "k");
    expect(readDraft(s, "k")).toBeNull();
  });

  it("tells an untouched form from a started one", () => {
    expect(isBlankDraft({ name: "", phone: "  ", seats: [] })).toBe(true);
    expect(isBlankDraft({ name: "Айгерим", phone: "" })).toBe(false);
    expect(isBlankDraft({ seats: ["s1"] })).toBe(false);
  });
});
