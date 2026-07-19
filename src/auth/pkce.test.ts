/**
 * PKCE helper tests (Web Crypto).
 */
import { describe, it, expect } from "vitest";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateNonce,
  generateState,
  randomString,
} from "./pkce";

describe("randomString", () => {
  it("returns URL-safe base64 without padding", () => {
    const s = randomString(16);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(s.includes("=")).toBe(false);
    // 16 bytes → ~22 chars of b64url
    expect(s.length).toBeGreaterThanOrEqual(20);
  });

  it("varies across calls", () => {
    const a = randomString(8);
    const b = randomString(8);
    // astronomically unlikely to collide
    expect(a).not.toBe(b);
  });
});

describe("PKCE + state generators", () => {
  it("verifier / state / nonce are non-empty URL-safe strings", () => {
    for (const s of [
      generateCodeVerifier(),
      generateState(),
      generateNonce(),
    ]) {
      expect(s.length).toBeGreaterThan(10);
      expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("code challenge is S256 of verifier (deterministic)", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = await generateCodeChallenge(verifier);
    // RFC 7636 appendix B known value
    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("different verifiers → different challenges", async () => {
    const a = await generateCodeChallenge(generateCodeVerifier());
    const b = await generateCodeChallenge(generateCodeVerifier());
    expect(a).not.toBe(b);
  });
});
