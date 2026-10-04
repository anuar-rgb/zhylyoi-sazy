import { describe, expect, it } from "vitest";
import { MAX_TOKENS, STORAGE_KEY, addToken, readTokens, removeTokens, type TokenStorage } from "./myTickets";

function memory(initial?: string): TokenStorage & { raw: () => string | null } {
  let value: string | null = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key: string, v: string) => {
      value = v;
    },
    raw: () => value,
  };
}

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("remembered tickets", () => {
  it("starts empty", () => {
    expect(readTokens(memory())).toEqual([]);
  });

  it("remembers a token and lists the newest first", () => {
    const s = memory();
    addToken(s, id(1));
    addToken(s, id(2));
    expect(readTokens(s)).toEqual([id(2), id(1)]);
  });

  it("does not list the same booking twice, and moves it to the front", () => {
    const s = memory();
    addToken(s, id(1));
    addToken(s, id(2));
    addToken(s, id(1));
    expect(readTokens(s)).toEqual([id(1), id(2)]);
  });

  it("ignores anything that is not a token", () => {
    const s = memory();
    addToken(s, "not-a-token");
    addToken(s, "<script>alert(1)</script>");
    expect(readTokens(s)).toEqual([]);
  });

  it("survives damaged storage", () => {
    expect(readTokens(memory("{{{ not json"))).toEqual([]);
    expect(readTokens(memory(JSON.stringify({ a: 1 })))).toEqual([]);
    expect(readTokens(memory(JSON.stringify([id(1), 5, "x", null])))).toEqual([id(1)]);
  });

  it("forgets removed tokens and keeps the rest", () => {
    const s = memory();
    addToken(s, id(1));
    addToken(s, id(2));
    addToken(s, id(3));
    removeTokens(s, [id(2)]);
    expect(readTokens(s)).toEqual([id(3), id(1)]);
  });

  it("keeps at most a sensible number", () => {
    const s = memory();
    for (let i = 1; i <= MAX_TOKENS + 5; i++) addToken(s, id(i));
    const tokens = readTokens(s);
    expect(tokens).toHaveLength(MAX_TOKENS);
    expect(tokens[0]).toBe(id(MAX_TOKENS + 5));
  });

  it("does not throw when storage refuses to write", () => {
    const refusing: TokenStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => addToken(refusing, id(1))).not.toThrow();
  });

  it("stores under a versioned key", () => {
    expect(STORAGE_KEY).toBe("myTickets:v1");
  });
});
