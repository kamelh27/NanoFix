import { apiGet, apiPost } from "@/lib/api";
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
