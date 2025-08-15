"use client";
import { v4 as uuid } from "uuid";
import { Client, ID } from "@/types";
import { readArray, upsertById, writeArray, removeById } from "./storage";

const KEY = "clients";

export function listClients(): Client[] {
  return readArray<Client>(KEY).sort((a, b) => a.name.localeCompare(b.name));
}

export function getClient(id: ID): Client | undefined {
  return listClients().find((c) => c.id === id);
}

export function createClient(data: Omit<Client, "id" | "createdAt">): Client {
  const client: Client = { id: uuid(), createdAt: new Date().toISOString(), ...data };
  const list = listClients();
  list.push(client);
  writeArray(KEY, list);
  return client;
}

export function updateClient(id: ID, data: Partial<Omit<Client, "id" | "createdAt">>): Client | undefined {
  const list = listClients();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  list[idx] = { ...list[idx], ...data };
  writeArray(KEY, list);
  return list[idx];
}

export function deleteClient(id: ID): void {
  removeById<Client>(KEY, id);
}
