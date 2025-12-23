// panafrontend/utils/idb.ts
// Simple image cache using localStorage (NO IndexedDB library needed).
// This exists mainly so AdminPage.tsx can import getImageFromDB and the app can run.

const PREFIX = "pana_img_cache:";

export async function getImageFromDB(key: string): Promise<string | null> {
  try {
    // If it's already a real image (base64), don't try to "lookup" again
    if (!key) return null;
    if (key.startsWith("data:image/")) return null;

    const v = localStorage.getItem(PREFIX + key);
    return v || null;
  } catch {
    return null;
  }
}

// Optional helpers (not required, but useful later)
export async function saveImageToDB(key: string, dataUrl: string): Promise<void> {
  try {
    if (!key) return;
    if (!dataUrl?.startsWith("data:image/")) return;
    localStorage.setItem(PREFIX + key, dataUrl);
  } catch {
    // ignore
  }
}

export async function deleteImageFromDB(key: string): Promise<void> {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

export async function clearImageDB(): Promise<void> {
  try {
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (k.startsWith(PREFIX)) localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}
