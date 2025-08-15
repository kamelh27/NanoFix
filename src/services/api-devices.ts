import { apiDelete, apiGet, apiPost } from "@/lib/api";
import type { DeviceStatus } from "@/types";

interface ApiDevice {
  _id: string;
  client: string | { _id: string; name: string };
  brand: string;
  model: string;
  issue?: string;
  status?: string;
  fechaIngreso?: string;
  createdAt: string;
}

export interface UIDeviceBrief {
  id: string;
  clientId: string;
  clientName?: string;
  brand: string;
  model: string;
  issue?: string;
  status: DeviceStatus;
}

function fromApiStatus(s?: string): DeviceStatus {
  const v = (s || "").toLowerCase();
  if (v === "entregado") return "entregado";
  if (v === "listo" || v === "reparado") return "reparado";
  // includes "en reparación" and "diagnóstico" as in-progress
  return "en_reparacion";
}

function toBrief(d: ApiDevice): UIDeviceBrief {
  return {
    id: d._id,
    clientId: typeof d.client === "string" ? d.client : d.client._id,
    clientName: typeof d.client === "string" ? undefined : d.client.name,
    brand: d.brand,
    model: d.model,
    issue: d.issue,
    status: fromApiStatus(d.status),
  };
}

export async function listDevicesByClientApi(clientId: string): Promise<UIDeviceBrief[]> {
  const data = await apiGet<ApiDevice[]>(`/api/devices?client=${encodeURIComponent(clientId)}`);
  return data.map(toBrief);
}

export async function listDevicesApi(): Promise<UIDeviceBrief[]> {
  const data = await apiGet<ApiDevice[]>(`/api/devices`);
  return data.map(toBrief);
}

// Detail shape from backend
interface ApiRepairItem { _id: string; status: string; comment?: string; at: string; }
interface ApiDeviceDetail extends ApiDevice { history: ApiRepairItem[] }

export interface UIDeviceHistoryItem { id: string; status: DeviceStatus; note?: string; date: string }
export interface UIDeviceDetail {
  id: string;
  clientId: string;
  clientName?: string;
  brand: string;
  model: string;
  issue?: string;
  status: DeviceStatus;
  intakeDate: string; // ISO
  history: UIDeviceHistoryItem[];
}

export async function getDeviceApi(id: string): Promise<UIDeviceDetail> {
  const d = await apiGet<ApiDeviceDetail>(`/api/devices/${id}`);
  return {
    id: d._id,
    clientId: typeof d.client === "string" ? d.client : d.client._id,
    clientName: typeof d.client === "string" ? undefined : d.client.name,
    brand: d.brand,
    model: d.model,
    issue: d.issue,
    status: fromApiStatus(d.status),
    intakeDate: d.fechaIngreso || d.createdAt,
    history: (d.history || []).map((h) => ({ id: h._id, status: fromApiStatus(h.status), note: h.comment, date: h.at })),
  };
}

function toApiStatus(s: DeviceStatus): string {
  if (s === "entregado") return "entregado";
  if (s === "reparado") return "listo";
  return "en reparación";
}

export async function createDeviceApi(payload: {
  clientId: string;
  brand: string;
  model: string;
  issue: string;
  status: DeviceStatus;
  intakeDate: string; // ISO
}): Promise<UIDeviceDetail> {
  const body = {
    client: payload.clientId,
    brand: payload.brand,
    model: payload.model,
    issue: payload.issue,
    status: toApiStatus(payload.status),
    fechaIngreso: new Date(payload.intakeDate).toISOString(),
  };
  const d = await apiPost<ApiDeviceDetail>(`/api/devices`, body);
  // When creating, backend returns device without history; compose a minimal detail
  return {
    id: d._id,
    clientId: typeof d.client === "string" ? d.client : d.client._id,
    clientName: typeof d.client === "string" ? undefined : (d as any).client?.name,
    brand: d.brand,
    model: d.model,
    issue: d.issue,
    status: fromApiStatus(d.status),
    intakeDate: d.fechaIngreso || d.createdAt,
    history: [],
  };
}

export async function deleteDeviceApi(id: string): Promise<void> {
  await apiDelete(`/api/devices/${id}`);
}
