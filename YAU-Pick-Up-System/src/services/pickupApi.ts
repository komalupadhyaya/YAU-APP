import type {
  PickupSchool,
  PickupSchoolSignout,
  PickupSchoolStudent,
  PickupStatusPayload
} from "../types/pickup";
import { getAuthClient } from "./firebase";

type Json = Record<string, unknown>;

function baseUrl(): string {
  const v = import.meta.env.VITE_API_BASE_URL as string | undefined;
  // Planning doc base includes `/apis`, and pickup endpoints are under `/pickup`.
  // Example: https://yau-app.onrender.com
  return (v ?? "").replace(/\/+$/, "");
}

function pickupUrl(path: string): string {
  const b = baseUrl();
  if (!b) throw new Error("Missing VITE_API_BASE_URL (example: https://.../apis)");
  return `${b}/pickup${path.startsWith("/") ? "" : "/"}${path}`;
}

function unwrapPayload<T>(payload: unknown): T {
  // Backend commonly returns { success: true, data: ... , count?: number }
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as any).data as T;
  }
  return payload as T;
}

async function requestJson<T>(
  path: string,
  init?: RequestInit & { bodyJson?: Json }
): Promise<{ ok: true; data: T } | { ok: false; status: number; data?: unknown; error?: string }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    const token = await getAuthClient().currentUser?.getIdToken?.();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(pickupUrl(path), {
      ...init,
      // Avoid 304 Not Modified responses with empty body (common when hitting local emulators).
      cache: "no-store",
      headers: {
        ...headers,
        ...(init?.headers as Record<string, string> | undefined)
      },
      body: init?.bodyJson ? JSON.stringify(init.bodyJson) : init?.body
    });

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const rawPayload = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);
    const payload = unwrapPayload<T>(rawPayload);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: rawPayload,
        error:
          typeof rawPayload === "string"
            ? rawPayload
            : (rawPayload as any)?.message ?? (rawPayload as any)?.error
      };
    }

    return { ok: true, data: payload as T };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : "Network error"
    };
  }
}

export async function listSchools(isActive: boolean = true) {
  const qs = new URLSearchParams();
  qs.set("isActive", String(isActive));
  return requestJson<PickupSchool[]>(`/schools?${qs.toString()}`, { method: "GET" });
}

export async function getPickupStatus(input: {
  schoolId: string;
  date?: string; // YYYY-MM-DD
  isActive?: boolean; // omit for "all"
  grade?: string;
  sport?: string;
}) {
  const qs = new URLSearchParams();
  if (input.date) qs.set("date", input.date);
  if (typeof input.isActive === "boolean") qs.set("isActive", String(input.isActive));
  if (input.grade) qs.set("grade", input.grade);
  if (input.sport) qs.set("sport", input.sport);

  return requestJson<PickupStatusPayload>(
    `/schools/${encodeURIComponent(input.schoolId)}/pickup-status?${qs.toString()}`,
    { method: "GET" }
  );
}

export async function listSchoolStudents(schoolId: string) {
  const qs = new URLSearchParams();
  qs.set("isActive", "true");
  return requestJson<PickupSchoolStudent[]>(
    `/schools/${encodeURIComponent(schoolId)}/students?${qs.toString()}`,
    { method: "GET" }
  );
}

export async function listSchoolSignouts(schoolId: string, date?: string) {
  const qs = new URLSearchParams();
  if (date) qs.set("date", date);
  return requestJson<PickupSchoolSignout[]>(
    `/schools/${encodeURIComponent(schoolId)}/signouts?${qs.toString()}`,
    { method: "GET" }
  );
}

export async function createSchoolSignout(input: {
  schoolId: string;
  schoolStudentId: string;
  parentGuardianName: string;
  notes?: string;
  date?: string; // YYYY-MM-DD; usually omit to use server "today"
  signedOutBy?: string; // sent as x-username (audit)
}) {
  const headers: Record<string, string> = {};
  if (input.signedOutBy) headers["x-username"] = input.signedOutBy;

  return requestJson<{ id: string }>(`/schools/${encodeURIComponent(input.schoolId)}/signouts`, {
    method: "POST",
    headers,
    bodyJson: {
      schoolStudentId: input.schoolStudentId,
      parentGuardianName: input.parentGuardianName,
      notes: input.notes,
      date: input.date
    }
  });
}

