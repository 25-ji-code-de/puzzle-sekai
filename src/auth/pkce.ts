/**
 * PKCE + OAuth state helpers (Web Crypto).
 */

const b64url = (bytes: ArrayBuffer | Uint8Array): string => {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]!);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const randomString = (byteLength = 32): string => {
  const buf = new Uint8Array(byteLength);
  crypto.getRandomValues(buf);
  return b64url(buf);
};

export const generateCodeVerifier = (): string => randomString(32);

export const generateCodeChallenge = async (
  verifier: string,
): Promise<string> => {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return b64url(hash);
};

export const generateState = (): string => randomString(16);
export const generateNonce = (): string => randomString(16);
