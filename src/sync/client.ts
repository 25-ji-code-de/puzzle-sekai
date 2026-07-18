/**
 * Gateway /user/sync client.
 */
import { getAccessToken, logout } from "../auth";
import { GATEWAY_BASE, SYNC_PROJECT } from "../auth/config";
import { parsePicoSyncData } from "./merge";
import type { PicoSyncData } from "./types";

export type CloudSyncEnvelope = {
  user_id?: string;
  project: string;
  data: PicoSyncData | null;
  version: number;
  updated_at: number | null;
};

export type UploadResult = {
  success: boolean;
  data: PicoSyncData;
  version: number;
  updated_at: number;
};

const authHeaders = async (): Promise<HeadersInit | null> => {
  const token = await getAccessToken();
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export const fetchCloudSync = async (): Promise<CloudSyncEnvelope | null> => {
  const headers = await authHeaders();
  if (!headers) return null;
  const url = `${GATEWAY_BASE}/user/sync?project=${encodeURIComponent(SYNC_PROJECT)}`;
  const res = await fetch(url, { headers });
  if (res.status === 401) {
    logout();
    return null;
  }
  if (!res.ok) {
    throw new Error(`sync_get_${res.status}`);
  }
  const json = (await res.json()) as {
    user_id?: string;
    project?: string;
    data?: unknown;
    version?: number;
    updated_at?: number | null;
  };
  return {
    user_id: json.user_id,
    project: json.project || SYNC_PROJECT,
    data: parsePicoSyncData(json.data),
    version: Number(json.version) || 0,
    updated_at: json.updated_at ?? null,
  };
};

/**
 * Upload merged data. Pass cloudVersion so server takes client blob as-is
 * (clientVersion >= cloudVersion avoids 25ji-shaped server merge).
 */
export const uploadCloudSync = async (
  data: PicoSyncData,
  cloudVersion: number,
): Promise<UploadResult | null> => {
  const headers = await authHeaders();
  if (!headers) return null;
  const res = await fetch(`${GATEWAY_BASE}/user/sync`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      project: SYNC_PROJECT,
      version: Math.max(0, cloudVersion),
      data,
    }),
  });
  if (res.status === 401) {
    logout();
    return null;
  }
  if (!res.ok) {
    throw new Error(`sync_post_${res.status}`);
  }
  const json = (await res.json()) as {
    success?: boolean;
    data?: unknown;
    version?: number;
    updated_at?: number;
  };
  const parsed = parsePicoSyncData(json.data) || data;
  return {
    success: json.success !== false,
    data: parsed,
    version: Number(json.version) || cloudVersion + 1,
    updated_at: Number(json.updated_at) || Date.now(),
  };
};
