import { apiGet, apiPost, apiUpload, apiPut } from "@/lib/api";
import type { DeviceStatus } from "@/types";

interface ApiRepairItem {
  _id: string;
  device: string | { _id: string };
  status: string; // canonical backend values
  comment?: string;
  at: string;
}

function toApiStatus(s: DeviceStatus): string {
  if (s === "entregado") return "entregado";
  if (s === "reparado") return "listo";
  return "en reparación";
}

export async function addRepairApi(payload: { deviceId: string; status: DeviceStatus; comment?: string }): Promise<ApiRepairItem> {
  return apiPost<ApiRepairItem>("/api/repairs", {
    device: payload.deviceId,
    status: toApiStatus(payload.status),
    comment: payload.comment,
  });
}

export async function listRepairsByDeviceApi(deviceId: string): Promise<ApiRepairItem[]> {
  const params = new URLSearchParams({ deviceId });
  return apiGet<ApiRepairItem[]>(`/api/repairs?${params.toString()}`);
}

export async function updateRepairApi(id: string, payload: Partial<{ status: DeviceStatus; comment: string }>): Promise<ApiRepairItem> {
  const body: any = {};
  if (payload.status) body.status = toApiStatus(payload.status);
  if (typeof payload.comment === "string") body.comment = payload.comment;
  return apiPut<ApiRepairItem>(`/api/repairs/${id}`, body);
}

export async function uploadRepairPhotosApi(id: string, files: File[]): Promise<string[]> {
  const form = new FormData();
  for (const f of files) form.append("photos", f);
  const res = await apiUpload<{ photos: string[] }>(`/api/repairs/${id}/photos`, form);
  return res.photos || [];
}

export async function addRepairPartsApi(id: string, items: Array<{ productId: string; quantity: number }>): Promise<{ parts: Array<{ product: string; quantity: number }> }> {
  const res = await apiPost<{ parts: Array<{ product: string; quantity: number }> }>(`/api/repairs/${id}/parts`, { items });
  return res;
}
