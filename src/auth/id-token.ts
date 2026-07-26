/**
 * ID Token 验证（OIDC）。
 *
 * 这里补的是一个**一直缺的闭环**：`startLogin` 从一开始就发了 `nonce`
 * （见 oidc.ts），SEKAI Pass 服务端也一直把它写回 ID Token，但回调里
 * 只解构 `access_token` / `refresh_token`，从头到尾没碰过 `id_token` ——
 * 那个 nonce 发出去就没有下文了。
 *
 * nonce 挡的是 **ID Token 注入**：攻击者把在别处（别的用户、别的会话）
 * 拿到的**合法** ID Token 塞进受害者的回调。`state` 挡不住这个 ——
 * 它保证的是「这次回调对应我发起的那次请求」，是外层参数；`nonce` 写在
 * ID Token 内部、由签发方签名带回，保证的是「这个 ID Token 就是为这次
 * 请求签发的」。
 *
 * **不验签的 nonce 校验没有意义** —— 能注入 token 的攻击者同样能伪造
 * nonce。所以这两步必须一起做，本模块不提供只做其中一步的入口。
 */
import { PASS_CLIENT_ID, PASS_ISSUER } from "./config";
import { devWarn } from "../util/dev-log";

/** 时钟偏移容差（秒）。 */
const CLOCK_SKEW_SEC = 60;

/**
 * 允许的签名算法。
 *
 * 只收非对称算法。`alg: none` 与任何 HMAC 算法都不在表里，于是
 * 「把 JWKS 里的公钥当成 HMAC 密钥」的经典伪造攻击直接不成立。
 * SEKAI Pass 签 ID Token 用的是 ES256。
 *
 * `__proto__: null` 是为了让 `ALGS["constructor"]` 也是 undefined ——
 * 否则 `alg: "constructor"` 能顺着原型链拿到一个真值。
 */
const ALGS: Record<
  string,
  {
    importParams:
      AlgorithmIdentifier | EcKeyImportParams | RsaHashedImportParams;
    verifyParams: AlgorithmIdentifier | EcdsaParams;
  }
> = {
  __proto__: null,
  ES256: {
    importParams: { name: "ECDSA", namedCurve: "P-256" },
    verifyParams: { name: "ECDSA", hash: { name: "SHA-256" } },
  },
  RS256: {
    importParams: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    verifyParams: { name: "RSASSA-PKCS1-v1_5" },
  },
} as never;

export type IdTokenClaims = {
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
  iat?: unknown;
  nonce?: unknown;
  sub?: unknown;
  [key: string]: unknown;
};

export type ValidationResult =
  { ok: true; claims: IdTokenClaims } | { ok: false; error: string };

/*
 * 显式建在一个 ArrayBuffer 上：`new Uint8Array(n)` 的类型是
 * `Uint8Array<ArrayBufferLike>`，而 WebCrypto 的 BufferSource 要求
 * `ArrayBuffer`（SharedArrayBuffer 不算），直接传会被 tsc 拒掉。
 */
const b64urlToBytes = (s: string): Uint8Array<ArrayBuffer> => {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
};

const decodeSegment = (segment: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(
      new TextDecoder().decode(b64urlToBytes(segment)),
    );
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
};

/** JWKS 一次会话只拉一次。 */
let jwksPromise: Promise<Record<string, unknown>[]> | null = null;

/** 测试用：清掉缓存。 */
export const resetJwksCache = (): void => {
  jwksPromise = null;
};

const fetchJwks = async (): Promise<Record<string, unknown>[]> => {
  if (!jwksPromise) {
    jwksPromise = (async () => {
      const { getJson } = await import("../native/http");
      const issuer = PASS_ISSUER.replace(/\/$/, "");

      // 先问 discovery 要 jwks_uri，拿不到再按约定路径推
      let jwksUri = `${issuer}/.well-known/jwks.json`;
      try {
        const disc = await getJson(
          `${issuer}/.well-known/openid-configuration`,
        );
        if (disc.ok) {
          const doc = disc.json<Record<string, unknown>>();
          if (typeof doc?.jwks_uri === "string") jwksUri = doc.jwks_uri;
        }
      } catch (e) {
        devWarn("[auth] discovery failed, falling back to well-known jwks", e);
      }

      const res = await getJson(jwksUri);
      if (!res.ok) throw new Error(`jwks_${res.status}`);
      const doc = res.json<{ keys?: unknown }>();
      return Array.isArray(doc?.keys)
        ? (doc.keys as Record<string, unknown>[])
        : [];
    })().catch((e) => {
      // 失败不缓存，下次还能重试
      jwksPromise = null;
      throw e;
    });
  }
  return jwksPromise;
};

/**
 * 验证一个 ID Token：签名 + `iss` / `aud` / `exp` / `iat` / `nonce`。
 *
 * @param expectedNonce 本次授权请求发出的 nonce。发过就必须对得上。
 */
export const validateIdToken = async (
  idToken: string,
  expectedNonce: string | null | undefined,
): Promise<ValidationResult> => {
  const parts = String(idToken).split(".");
  if (parts.length !== 3) return { ok: false, error: "id_token_malformed" };

  const header = decodeSegment(parts[0]!);
  const claims = decodeSegment(parts[1]!);
  if (!header || !claims) return { ok: false, error: "id_token_malformed" };

  // 算法白名单先判，早于任何网络请求
  const alg = typeof header.alg === "string" ? header.alg : "";
  const spec = ALGS[alg];
  if (!spec) return { ok: false, error: `id_token_alg_${alg || "none"}` };

  let keys: Record<string, unknown>[];
  try {
    keys = await fetchJwks();
  } catch {
    return { ok: false, error: "jwks_unavailable" };
  }

  const kid = typeof header.kid === "string" ? header.kid : null;
  const key = keys.find(
    (k) => (!kid || k.kid === kid) && (!k.alg || k.alg === alg),
  );
  if (!key) return { ok: false, error: "id_token_key_not_found" };

  let publicKey: CryptoKey;
  try {
    publicKey = await crypto.subtle.importKey(
      "jwk",
      { ...key, key_ops: ["verify"] } as JsonWebKey,
      spec.importParams,
      false,
      ["verify"],
    );
  } catch (e) {
    devWarn("[auth] jwks key import failed", e);
    return { ok: false, error: "id_token_key_unusable" };
  }

  let verified: boolean;
  try {
    verified = await crypto.subtle.verify(
      spec.verifyParams,
      publicKey,
      b64urlToBytes(parts[2]!),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
  } catch {
    // 签名段不是合法 base64url 之类 —— 一律当作验签失败
    verified = false;
  }
  if (!verified) return { ok: false, error: "id_token_bad_signature" };

  // ── 签名过了，再看 claim ──────────────────────────────────────
  const issuer = PASS_ISSUER.replace(/\/$/, "");
  if (claims.iss !== issuer) return { ok: false, error: "id_token_bad_issuer" };

  const audiences = Array.isArray(claims.aud)
    ? claims.aud.map(String)
    : [String(claims.aud ?? "")];
  if (!audiences.includes(PASS_CLIENT_ID)) {
    return { ok: false, error: "id_token_bad_audience" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== "number" || claims.exp + CLOCK_SKEW_SEC < now) {
    return { ok: false, error: "id_token_expired" };
  }
  if (typeof claims.iat === "number" && claims.iat - CLOCK_SKEW_SEC > now) {
    return { ok: false, error: "id_token_future_iat" };
  }

  // nonce：发过就必须对得上。这一步才是防 ID Token 注入的那一步。
  if (expectedNonce && claims.nonce !== expectedNonce) {
    return { ok: false, error: "id_token_nonce_mismatch" };
  }

  return { ok: true, claims };
};
