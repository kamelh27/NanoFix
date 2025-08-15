"use client";
import { v4 as uuid } from "uuid";
import { Device, DeviceHistoryItem, DeviceStatus, ID } from "@/types";
import { readArray, writeArray } from "./storage";

const KEY = "devices";

export function listDevices(): Device[] {
  return readArray<Device>(KEY).sort((a, b) => (a.intakeDate < b.intakeDate ? 1 : -1));
}

export function getDevice(id: ID): Device | undefined {
  return listDevices().find((d) => d.id === id);
}

export function listDevicesByStatus(status: DeviceStatus): Device[] {
  return listDevices().filter((d) => d.status === status);
}

export function createDevice(data: Omit<Device, "id" | "history">): Device {
  const initial: DeviceHistoryItem = {
    id: uuid(),
    date: new Date().toISOString(),
    status: data.status,
    note: "Ingreso del equipo",
  };
  const device: Device = { id: uuid(), history: [initial], ...data };
  const list = listDevices();
  list.push(device);
  writeArray(KEY, list);
  return device;
}

export function updateDevice(id: ID, data: Partial<Omit<Device, "id">>): Device | undefined {
  const list = listDevices();
  const idx = list.findIndex((d) => d.id === id);
  if (idx === -1) return undefined;
  list[idx] = { ...list[idx], ...data } as Device;
  writeArray(KEY, list);
  return list[idx];
}

export function deleteDevice(id: ID): void {
  const list = listDevices().filter((d) => d.id !== id);
  writeArray(KEY, list);
}

export function addDeviceHistory(id: ID, status: DeviceStatus, note?: string): Device | undefined {
  const list = listDevices();
  const idx = list.findIndex((d) => d.id === id);
  if (idx === -1) return undefined;
  const entry: DeviceHistoryItem = { id: uuid(), date: new Date().toISOString(), status, note };
  const updated: Device = { ...list[idx], status, history: [entry, ...list[idx].history] };
  list[idx] = updated;
  writeArray(KEY, list);
  return updated;
}
