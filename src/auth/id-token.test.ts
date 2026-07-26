/**
 * ID Token 验证的测试。
 *
 * 用**真实的 ES256 密钥对**签 token、搭一个假 JWKS 端点 ——
 * 没有 mock 掉验签这一步。不验签的 nonce 校验是没有意义的
 * （能注入 token 的攻击者同样能伪造 nonce），所以这两件事必须
 * 一起测，把验签 mock 掉等于什么都没测。
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

/*
 * vi.mock 的工厂会被提升到文件顶部，所以它引用的东西也必须一起提升 ——
 * 直接引用普通的 const 会报 "Cannot access ... before initialization"。
 */
const { ISSUER, CLIENT_ID, KID, httpState } = vi.hoisted(() => ({
  ISSUER: "https://id.example",
  CLIENT_ID: "puzzle_client",
  KID: "sig-1",
  /** 假的 native/http 的状态：discovery 与 JWKS 都从这里回。 */
  httpState: {
    jwks: [] as Record<string, unknown>[],
    jwksCalls: 0,
    jwksStatus: 200,
  },
}));

vi.mock("./config", () => ({
  PASS_ISSUER: ISSUER,
  PASS_CLIENT_ID: CLIENT_ID,
  isNativeBuild: () => false,
}));

vi.mock("../native/http", () => ({
  getJson: async (url: string) => {
    if (url.includes("openid-configuration")) {
      return {
        ok: true,
        status: 200,
        text: "",
        json: () => ({ jwks_uri: `${ISSUER}/jwks` }),
      };
    }
    httpState.jwksCalls += 1;
    return {
      ok: httpState.jwksStatus === 200,
      status: httpState.jwksStatus,
      text: "",
      json: () => ({ keys: httpState.jwks }),
    };
  },
}));

import { validateIdToken, resetJwksCache } from "./id-token";

let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;
let publicJwk: Record<string, unknown>;

const b64url = (bytes: ArrayBuffer | Uint8Array): string => {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]!);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const sign = async (
  claims: Record<string, unknown>,
  { key, header }: { key?: CryptoKey; header?: Record<string, unknown> } = {},
): Promise<string> => {
  const enc = new TextEncoder();
  const h = b64url(
    enc.encode(
      JSON.stringify(header ?? { alg: "ES256", typ: "JWT", kid: KID }),
    ),
  );
  const p = b64url(enc.encode(JSON.stringify(claims)));
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    key ?? privateKey,
    enc.encode(`${h}.${p}`),
  );
  return `${h}.${p}.${b64url(sig)}`;
};

const baseClaims = (overrides: Record<string, unknown> = {}) => {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: ISSUER,
    sub: "u1",
    aud: CLIENT_ID,
    exp: now + 3600,
    iat: now,
    ...overrides,
  };
};

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  privateKey = pair.privateKey;
  publicJwk = {
    ...((await crypto.subtle.exportKey("jwk", pair.publicKey)) as Record<
      string,
      unknown
    >),
    kid: KID,
    alg: "ES256",
  };

  const other = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  otherPrivateKey = other.privateKey;
});

beforeEach(() => {
  resetJwksCache();
  httpState.jwks = [publicJwk];
  httpState.jwksCalls = 0;
  httpState.jwksStatus = 200;
});

describe("签名", () => {
  it("合法签名通过", async () => {
    const r = await validateIdToken(await sign(baseClaims()), null);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.claims.sub).toBe("u1");
  });

  it("别的私钥签的被拒", async () => {
    const r = await validateIdToken(
      await sign(baseClaims(), { key: otherPrivateKey }),
      null,
    );
    expect(r).toEqual({ ok: false, error: "id_token_bad_signature" });
  });

  it("篡改 payload 后被拒", async () => {
    const good = await sign(baseClaims());
    const [h, , s] = good.split(".");
    const evil = b64url(
      new TextEncoder().encode(JSON.stringify(baseClaims({ sub: "admin" }))),
    );
    const r = await validateIdToken(`${h}.${evil}.${s}`, null);
    expect(r).toEqual({ ok: false, error: "id_token_bad_signature" });
  });

  it("alg: none 被拒 —— 不能因为没签名就放行", async () => {
    const enc = new TextEncoder();
    const h = b64url(
      enc.encode(JSON.stringify({ alg: "none", typ: "JWT", kid: KID })),
    );
    const p = b64url(enc.encode(JSON.stringify(baseClaims())));
    const r = await validateIdToken(`${h}.${p}.`, null);
    expect(r).toEqual({ ok: false, error: "id_token_alg_none" });
  });

  it("HS256 被拒 —— 挡住「把公钥当 HMAC 密钥」", async () => {
    const enc = new TextEncoder();
    const h = b64url(
      enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT", kid: KID })),
    );
    const p = b64url(enc.encode(JSON.stringify(baseClaims())));
    const r = await validateIdToken(`${h}.${p}.AAAA`, null);
    expect(r).toEqual({ ok: false, error: "id_token_alg_HS256" });
  });

  it("alg 走不通原型链", async () => {
    // ALGS 用 __proto__: null 建，否则 alg=constructor 能拿到真值
    const enc = new TextEncoder();
    for (const alg of ["constructor", "toString", "__proto__"]) {
      const h = b64url(
        enc.encode(JSON.stringify({ alg, typ: "JWT", kid: KID })),
      );
      const p = b64url(enc.encode(JSON.stringify(baseClaims())));
      const r = await validateIdToken(`${h}.${p}.AAAA`, null);
      expect(r.ok, alg).toBe(false);
    }
  });

  it("白名单在任何网络请求之前先判", async () => {
    const enc = new TextEncoder();
    const h = b64url(enc.encode(JSON.stringify({ alg: "none", typ: "JWT" })));
    const p = b64url(enc.encode(JSON.stringify(baseClaims())));
    await validateIdToken(`${h}.${p}.`, null);
    expect(httpState.jwksCalls).toBe(0);
  });

  it("JWKS 里没有匹配 kid 的密钥时被拒", async () => {
    httpState.jwks = [{ ...publicJwk, kid: "other" }];
    const r = await validateIdToken(await sign(baseClaims()), null);
    expect(r).toEqual({ ok: false, error: "id_token_key_not_found" });
  });

  it("JWKS 只拉一次并缓存", async () => {
    const token = await sign(baseClaims());
    await validateIdToken(token, null);
    await validateIdToken(token, null);
    expect(httpState.jwksCalls).toBe(1);
  });

  it("JWKS 拉不到时不缓存失败，下次还能重试", async () => {
    httpState.jwksStatus = 503;
    const token = await sign(baseClaims());
    expect(await validateIdToken(token, null)).toEqual({
      ok: false,
      error: "jwks_unavailable",
    });

    httpState.jwksStatus = 200;
    expect((await validateIdToken(token, null)).ok).toBe(true);
  });

  it("段数不对直接拒", async () => {
    for (const bad of ["", "a.b", "a.b.c.d"]) {
      expect(await validateIdToken(bad, null)).toEqual({
        ok: false,
        error: "id_token_malformed",
      });
    }
  });

  it("segment 不是合法 JSON 时拒绝而不抛", async () => {
    expect(await validateIdToken("!!!.???.zzz", null)).toEqual({
      ok: false,
      error: "id_token_malformed",
    });
  });
});

describe("claim", () => {
  it("iss 不匹配被拒", async () => {
    const r = await validateIdToken(
      await sign(baseClaims({ iss: "https://evil.example" })),
      null,
    );
    expect(r).toEqual({ ok: false, error: "id_token_bad_issuer" });
  });

  it("aud 不含本 client 被拒", async () => {
    const r = await validateIdToken(
      await sign(baseClaims({ aud: "other" })),
      null,
    );
    expect(r).toEqual({ ok: false, error: "id_token_bad_audience" });
  });

  it("aud 是数组且包含本 client 时通过", async () => {
    const r = await validateIdToken(
      await sign(baseClaims({ aud: ["other", CLIENT_ID] })),
      null,
    );
    expect(r.ok).toBe(true);
  });

  it("过期被拒（容忍 60 秒偏移）", async () => {
    const now = Math.floor(Date.now() / 1000);
    expect(
      (await validateIdToken(await sign(baseClaims({ exp: now - 30 })), null))
        .ok,
    ).toBe(true);
    expect(
      await validateIdToken(await sign(baseClaims({ exp: now - 600 })), null),
    ).toEqual({
      ok: false,
      error: "id_token_expired",
    });
  });

  it("缺 exp 被拒 —— 不能当成永不过期", async () => {
    const claims = baseClaims();
    delete (claims as Record<string, unknown>).exp;
    expect(await validateIdToken(await sign(claims), null)).toEqual({
      ok: false,
      error: "id_token_expired",
    });
  });

  it("iat 在未来太多被拒", async () => {
    const now = Math.floor(Date.now() / 1000);
    expect(
      await validateIdToken(await sign(baseClaims({ iat: now + 600 })), null),
    ).toEqual({
      ok: false,
      error: "id_token_future_iat",
    });
  });
});

describe("nonce —— 这是本模块存在的理由", () => {
  it("匹配时通过", async () => {
    const r = await validateIdToken(
      await sign(baseClaims({ nonce: "n1" })),
      "n1",
    );
    expect(r.ok).toBe(true);
  });

  it("不匹配时拒绝 —— 挡的就是 ID Token 注入", async () => {
    // 攻击者塞进来的是一个**合法签名**的 ID Token，只是签给别的请求的
    const injected = await sign(baseClaims({ nonce: "attacker-session" }));
    expect(await validateIdToken(injected, "my-nonce")).toEqual({
      ok: false,
      error: "id_token_nonce_mismatch",
    });
  });

  it("期望 nonce 但 token 里没有，同样拒绝", async () => {
    expect(await validateIdToken(await sign(baseClaims()), "my-nonce")).toEqual(
      {
        ok: false,
        error: "id_token_nonce_mismatch",
      },
    );
  });

  it("没发过 nonce 就不检查", async () => {
    expect((await validateIdToken(await sign(baseClaims()), null)).ok).toBe(
      true,
    );
    expect((await validateIdToken(await sign(baseClaims()), "")).ok).toBe(true);
  });

  it("nonce 校验发生在验签之后 —— 单验 nonce 没有意义", async () => {
    // 用错误的私钥签、但 nonce 是对的：必须因为签名被拒，不能放行
    const forged = await sign(baseClaims({ nonce: "n1" }), {
      key: otherPrivateKey,
    });
    expect(await validateIdToken(forged, "n1")).toEqual({
      ok: false,
      error: "id_token_bad_signature",
    });
  });
});
