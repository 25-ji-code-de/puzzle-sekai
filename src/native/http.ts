/**
 * Native-aware HTTP helpers.
 *
 * Capacitor/Tauri webviews often run under opaque origins (e.g. https://localhost)
 * that IdP CORS will reject. CapacitorHttp uses the OS stack and bypasses CORS.
 * Web builds keep using fetch().
 */
import { isNativeBuild } from "../auth/config";
import { devWarn } from "../util/dev-log";
import { safeJsonParse } from "../util/json";
import { toNonNegInt } from "../util/number";

export type HttpResult = {
  ok: boolean;
  status: number;
  text: string;
  json: <T = unknown>() => T;
};

/** Pure: map status + body into HttpResult (exported for tests). */
export const toHttpResult = (status: number, text: string): HttpResult => ({
  ok: status >= 200 && status < 300,
  status,
  text,
  json: <T = unknown>() =>
    safeJsonParse<T>(text || "null", null as T | null) as T,
});

const toResult = toHttpResult;
/** POST application/x-www-form-urlencoded. */
export const postForm = async (
  url: string,
  body: URLSearchParams,
): Promise<HttpResult> => {
  if (isNativeBuild()) {
    try {
      const { CapacitorHttp } = await import("@capacitor/core");
      const res = await CapacitorHttp.request({
        url,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        data: body.toString(),
        // Disable JSON serialization of the body string.
        dataType: "text" as never,
      });
      const text =
        typeof res.data === "string"
          ? res.data
          : res.data != null
            ? JSON.stringify(res.data)
            : "";
      return toResult(toNonNegInt(res.status), text);
    } catch (e) {
      devWarn("[native-http] CapacitorHttp POST failed, falling back", e);
    }
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text().catch(() => "");
  return toResult(res.status, text);
};

/** GET with optional Bearer token. */
export const getJson = async (
  url: string,
  accessToken?: string,
): Promise<HttpResult> => {
  if (isNativeBuild()) {
    try {
      const { CapacitorHttp } = await import("@capacitor/core");
      const headers: Record<string, string> = {};
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      const res = await CapacitorHttp.request({
        url,
        method: "GET",
        headers,
      });
      const text =
        typeof res.data === "string"
          ? res.data
          : res.data != null
            ? JSON.stringify(res.data)
            : "";
      return toResult(toNonNegInt(res.status), text);
    } catch (e) {
      devWarn("[native-http] CapacitorHttp GET failed, falling back", e);
    }
  }

  const headers: HeadersInit = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(url, { headers });
  const text = await res.text().catch(() => "");
  return toResult(res.status, text);
};
