export type StorageStatus = {
  persisted: boolean
  usageBytes: number | null
  quotaBytes: number | null
}

/**
 * Pide al navegador que no borre IndexedDB bajo presión de espacio
 * (sobre todo relevante en iOS/Safari). Es silencioso: si no se concede,
 * la app funciona igual y el backup JSON sigue siendo la red de seguridad.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const [persisted, estimate] = await Promise.all([
    navigator.storage?.persisted?.().catch(() => false) ?? Promise.resolve(false),
    navigator.storage?.estimate?.().catch(() => undefined) ?? Promise.resolve(undefined),
  ])
  return {
    persisted,
    usageBytes: estimate?.usage ?? null,
    quotaBytes: estimate?.quota ?? null,
  }
}
