const isBrowser = () => typeof window !== "undefined" && !!window.localStorage;

export function readArray<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function writeArray<T>(key: string, value: T[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function upsertById<T extends { id: string }>(key: string, item: T): void {
  const list = readArray<T>(key);
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.push(item);
  writeArray<T>(key, list);
}

export function removeById<T extends { id: string }>(key: string, id: string): void {
  const list = readArray<T>(key).filter((x) => x.id !== id);
  writeArray<T>(key, list);
}
